import { db } from '../db';
import { modulePrerequisites, userModules, modules } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export interface PrerequisiteValidationResult {
  canEnroll: boolean;
  missingPrerequisites: Array<{
    modulePool: string;
    moduleName: string;
    isRequired: boolean;
    description?: string;
  }>;
  warningPrerequisites: Array<{
    modulePool: string;
    moduleName: string;
    description?: string;
  }>;
  message: string;
}

export interface PrerequisiteChain {
  modulePool: string;
  prerequisites: Array<{
    prerequisitePool: string;
    isRequired: boolean;
    description?: string;
    module: {
      pool: string;
      name: string;
      code: string;
      credits: number;
    };
  }>;
}

/**
 * Validates if a user can enroll in a specific module based on prerequisites
 */
export async function validatePrerequisites(
  userId: string,
  modulePool: string
): Promise<PrerequisiteValidationResult> {
  try {
    // Get prerequisites for the module
    const prerequisites = await db
      .select({
        prerequisite: modulePrerequisites,
        prerequisiteModule: modules,
      })
      .from(modulePrerequisites)
      .innerJoin(
        modules,
        eq(modulePrerequisites.prerequisitePool, modules.pool)
      )
      .where(eq(modulePrerequisites.modulePool, modulePool));

    // If no prerequisites, user can enroll
    if (prerequisites.length === 0) {
      return {
        canEnroll: true,
        missingPrerequisites: [],
        warningPrerequisites: [],
        message: 'No prerequisites required for this module.',
      };
    }

    // Get user's completed modules
    const userCompletedModules = await db
      .select({ modulePool: userModules.modulePool })
      .from(userModules)
      .where(
        and(eq(userModules.userId, userId), eq(userModules.status, 'COMPLETED'))
      );

    const completedPools = userCompletedModules.map((um) => um.modulePool);

    // Check which prerequisites are missing
    const missingRequired = [];
    const missingOptional = [];

    for (const prereq of prerequisites) {
      const isFulfilled = completedPools.includes(
        prereq.prerequisite.prerequisitePool
      );

      if (!isFulfilled) {
        const missingInfo = {
          modulePool: prereq.prerequisite.prerequisitePool,
          moduleName: prereq.prerequisiteModule.name,
          isRequired: prereq.prerequisite.isRequired,
          description: prereq.prerequisite.description || undefined,
        };

        if (prereq.prerequisite.isRequired) {
          missingRequired.push(missingInfo);
        } else {
          missingOptional.push(missingInfo);
        }
      }
    }

    const canEnroll = missingRequired.length === 0;
    let message = '';

    if (canEnroll) {
      if (missingOptional.length > 0) {
        message = `You can enroll, but consider completing ${missingOptional.length} optional prerequisite(s) first.`;
      } else {
        message = 'All prerequisites fulfilled. You can enroll in this module.';
      }
    } else {
      message = `Cannot enroll. You must complete ${missingRequired.length} required prerequisite(s) first.`;
    }

    return {
      canEnroll,
      missingPrerequisites: missingRequired,
      warningPrerequisites: missingOptional,
      message,
    };
  } catch (error) {
    console.error('Error validating prerequisites:', error);
    throw new Error('Failed to validate prerequisites');
  }
}

/**
 * Gets the complete prerequisite chain for a module (recursive dependencies)
 */
export async function getPrerequisiteChain(
  modulePool: string,
  visited: Set<string> = new Set()
): Promise<PrerequisiteChain> {
  // Prevent infinite loops in circular dependencies
  if (visited.has(modulePool)) {
    return {
      modulePool,
      prerequisites: [],
    };
  }

  visited.add(modulePool);

  const prerequisites = await db
    .select({
      prerequisite: modulePrerequisites,
      prerequisiteModule: modules,
    })
    .from(modulePrerequisites)
    .innerJoin(
      modules,
      eq(modulePrerequisites.prerequisitePool, modules.pool)
    )
    .where(eq(modulePrerequisites.modulePool, modulePool));

  const chain: PrerequisiteChain = {
    modulePool,
    prerequisites: prerequisites.map((prereq) => ({
      prerequisitePool: prereq.prerequisite.prerequisitePool,
      isRequired: prereq.prerequisite.isRequired,
      description: prereq.prerequisite.description || undefined,
      module: {
        pool: prereq.prerequisiteModule.pool,
        name: prereq.prerequisiteModule.name,
        code: prereq.prerequisiteModule.code,
        credits: prereq.prerequisiteModule.credits,
      },
    })),
  };

  return chain;
}

/**
 * Validates prerequisites for multiple modules (for study plan validation)
 */
export async function validateMultiplePrerequisites(
  userId: string,
  modulePools: string[]
): Promise<Record<string, PrerequisiteValidationResult>> {
  const results: Record<string, PrerequisiteValidationResult> = {};

  for (const modulePool of modulePools) {
    try {
      results[modulePool] = await validatePrerequisites(userId, modulePool);
    } catch (error) {
      console.error(`Error validating prerequisites for ${modulePool}:`, error);
      results[modulePool] = {
        canEnroll: false,
        missingPrerequisites: [],
        warningPrerequisites: [],
        message: 'Error validating prerequisites',
      };
    }
  }

  return results;
}

/**
 * Gets suggested enrollment order based on prerequisites
 */
export async function getSuggestedEnrollmentOrder(
  modulePools: string[]
): Promise<Array<{ modulePool: string; order: number; reasoning: string }>> {
  const moduleChains = await Promise.all(
    modulePools.map(async (pool) => ({
      modulePool: pool,
      chain: await getPrerequisiteChain(pool),
    }))
  );

  // Simple topological sort based on prerequisites
  const orderMap = new Map<string, number>();
  const result = [];

  // Modules with no prerequisites get order 1
  for (const { modulePool, chain } of moduleChains) {
    if (chain.prerequisites.length === 0) {
      orderMap.set(modulePool, 1);
      result.push({
        modulePool,
        order: 1,
        reasoning: 'No prerequisites required',
      });
    }
  }

  // Assign orders based on prerequisite depth
  let currentOrder = 2;
  let remaining = moduleChains.filter(
    ({ modulePool }) => !orderMap.has(modulePool)
  );

  while (remaining.length > 0 && currentOrder <= 10) {
    const canAssignNow = remaining.filter(({ chain }) =>
      chain.prerequisites.every((prereq) =>
        orderMap.has(prereq.prerequisitePool)
      )
    );

    if (canAssignNow.length === 0) {
      // Handle circular dependencies or complex cases
      for (const { modulePool } of remaining) {
        orderMap.set(modulePool, currentOrder);
        result.push({
          modulePool,
          order: currentOrder,
          reasoning: 'Complex dependency structure',
        });
      }
      break;
    }

    for (const { modulePool, chain } of canAssignNow) {
      orderMap.set(modulePool, currentOrder);
      const prereqCount = chain.prerequisites.filter((p) => p.isRequired).length;
      result.push({
        modulePool,
        order: currentOrder,
        reasoning: `Depends on ${prereqCount} prerequisite(s)`,
      });
    }

    remaining = remaining.filter(({ modulePool }) => !orderMap.has(modulePool));
    currentOrder++;
  }

  return result.sort((a, b) => a.order - b.order);
}