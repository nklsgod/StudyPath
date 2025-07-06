import { Router } from 'express';
import { db } from '../db';
import { modules, userModules, studyPlans, studyPlanModules } from '../db/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const getRecommendationsSchema = {
  query: Joi.object({
    targetSemester: Joi.string().optional(),
    maxCredits: Joi.number().min(1).max(30).default(15),
    focusArea: Joi.string().valid('INF', 'MAN', 'MK', 'GS', 'MAT', 'II', 'NAT', 'GEN').optional(),
    includeCompleted: Joi.boolean().default(false)
  })
};

const optimizeStudyPlanSchema = {
  body: Joi.object({
    studyPlanId: Joi.string().required(),
    semesterCount: Joi.number().min(1).max(12).default(6),
    maxCreditsPerSemester: Joi.number().min(1).max(30).default(15),
    prioritizeEasyModules: Joi.boolean().default(false)
  })
};

// Interface for module recommendations
interface ModuleRecommendation {
  module: typeof modules.$inferSelect;
  score: number;
  reasons: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  prerequisites: string[];
  recommendedSemester: number;
}

// GET /recommendations/modules - AI-powered module recommendations
router.get('/modules', authenticateToken, validateRequest(getRecommendationsSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { targetSemester, maxCredits = 15, focusArea, includeCompleted = false } = req.query;

    // Get user's module data
    const userModulesData = await db
      .select({
        modulePool: userModules.modulePool,
        status: userModules.status,
        grade: userModules.grade
      })
      .from(userModules)
      .where(eq(userModules.userId, userId));

    const completedModules = userModulesData
      .filter(um => um.status === 'COMPLETED')
      .map(um => um.modulePool);

    const enrolledModules = userModulesData
      .filter(um => ['IN_PROGRESS', 'PLANNED'].includes(um.status))
      .map(um => um.modulePool);

    // Get available modules
    const whereConditions = [];

    if (!includeCompleted) {
      const excludeModules = [...completedModules, ...enrolledModules];
      if (excludeModules.length > 0) {
        whereConditions.push(notInArray(modules.pool, excludeModules));
      }
    }

    if (focusArea && typeof focusArea === 'string') {
      whereConditions.push(eq(modules.category, focusArea));
    }

    const availableModules = whereConditions.length > 0
      ? await db.select().from(modules).where(and(...whereConditions))
      : await db.select().from(modules);

    // AI-powered recommendations
    const recommendations = calculateModuleRecommendations(
      availableModules,
      userModulesData,
      { targetSemester: targetSemester as string, maxCredits: maxCredits as number, focusArea: focusArea as string }
    );

    // Apply credit limit
    const maxCreditsNum = typeof maxCredits === 'string' ? parseInt(maxCredits) : 
                          typeof maxCredits === 'number' ? maxCredits : 15;
    let totalCredits = 0;
    const filteredRecommendations = recommendations.filter(rec => {
      if (totalCredits + rec.module.credits <= maxCreditsNum) {
        totalCredits += rec.module.credits;
        return true;
      }
      return false;
    });

    res.json({
      success: true,
      data: {
        recommendations: filteredRecommendations.slice(0, 10), // Top 10
        metadata: {
          totalAvailable: recommendations.length,
          selectedCount: filteredRecommendations.length,
          totalCredits,
                      maxCredits: maxCreditsNum,
          userProgress: {
            completed: completedModules.length,
            enrolled: enrolledModules.length,
            averageGrade: calculateAverageGrade(userModulesData)
          }
        }
      }
    });
  } catch (error) {
    console.error('Get module recommendations error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
});

// POST /recommendations/study-plan - Optimize study plan with AI
router.post('/study-plan', authenticateToken, validateRequest(optimizeStudyPlanSchema), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { studyPlanId, semesterCount = 6, maxCreditsPerSemester = 15, prioritizeEasyModules = false } = req.body;

    // Verify study plan ownership
    const studyPlan = await db
      .select()
      .from(studyPlans)
      .where(and(eq(studyPlans.id, studyPlanId), eq(studyPlans.userId, userId)))
      .limit(1);

    if (studyPlan.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Study plan not found' }
      });
      return;
    }

    // Get modules in study plan
    const planModules = await db
      .select({ module: modules })
      .from(studyPlanModules)
      .innerJoin(modules, eq(studyPlanModules.modulePool, modules.pool))
      .where(eq(studyPlanModules.studyPlanId, studyPlanId));

    // Get user context
    const userModulesData = await db
      .select()
      .from(userModules)
      .where(eq(userModules.userId, userId));

    // Generate optimized distribution
    const optimizedPlan = optimizeStudyPlanDistribution(
      planModules.map(pm => pm.module),
      userModulesData,
      { semesterCount, maxCreditsPerSemester, prioritizeEasyModules }
    );

    res.json({
      success: true,
      data: {
        studyPlan: studyPlan[0],
        optimizedDistribution: optimizedPlan,
        settings: { semesterCount, maxCreditsPerSemester, prioritizeEasyModules }
      }
    });
  } catch (error) {
    console.error('Optimize study plan error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
});

// GET /recommendations/insights - AI study insights
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    const [userModulesData, userStudyPlans] = await Promise.all([
      db.select().from(userModules).where(eq(userModules.userId, userId)),
      db.select().from(studyPlans).where(eq(studyPlans.userId, userId))
    ]);

    const insights = generateStudyInsights(userModulesData, userStudyPlans);

    res.json({
      success: true,
      data: { insights, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Get study insights error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
});

// AI Algorithm Functions
function calculateModuleRecommendations(
  availableModules: Array<typeof modules.$inferSelect>,
  userModules: Array<{ modulePool: string; status: string; grade: number | null }>,
  options: { targetSemester?: string; maxCredits: number; focusArea?: string }
): ModuleRecommendation[] {
  const completedByCategory = userModules
    .filter(um => um.status === 'COMPLETED')
    .reduce((acc, um) => {
      const category = extractCategory(um.modulePool);
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const averageGrade = calculateAverageGrade(userModules);

  return availableModules.map(module => {
    let score = 0;
    const reasons: string[] = [];

    // Credit-based scoring (0-20 points)
    score += Math.min(module.credits / 10 * 20, 20);

    // Focus area bonus (25 points)
    if (options.focusArea && module.category === options.focusArea) {
      score += 25;
      reasons.push(`Focus area: ${options.focusArea}`);
    }

    // Category experience (0-15 points)
    const categoryExp = completedByCategory[module.category] || 0;
    if (categoryExp > 0) {
      score += Math.min(categoryExp * 5, 15);
      reasons.push(`${categoryExp} modules in ${module.category}`);
    }

    // Performance-based recommendations
    if (averageGrade) {
      if (averageGrade <= 2.0 && module.credits >= 6) {
        score += 10;
        reasons.push('Suitable for high achiever');
      } else if (averageGrade > 3.0 && module.credits <= 6) {
        score += 15;
        reasons.push('Manageable workload');
      }
    }

    // Pool priority scoring
    if (module.pool === 'Orientierungsphase') {
      score += 30;
      reasons.push('Foundation module');
    } else if (module.pool === 'IT Vertiefung') {
      score += 20;
      reasons.push('Core specialization');
    }

    // Difficulty assessment
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (module.credits <= 3) difficulty = 'easy';
    else if (module.credits >= 9) difficulty = 'hard';

    return {
      module,
      score: Math.round(score),
      reasons,
      difficulty,
      prerequisites: inferPrerequisites(module),
      recommendedSemester: calculateRecommendedSemester(module, userModules.length)
    };
  }).sort((a, b) => b.score - a.score);
}

function optimizeStudyPlanDistribution(
  modulesList: Array<typeof modules.$inferSelect>,
  userModules: Array<any>,
  options: { semesterCount: number; maxCreditsPerSemester: number; prioritizeEasyModules: boolean }
) {
  const { semesterCount, maxCreditsPerSemester, prioritizeEasyModules } = options;
  
  // Sort modules intelligently
  const sortedModules = modulesList.sort((a: typeof modules.$inferSelect, b: typeof modules.$inferSelect) => {
    if (prioritizeEasyModules) return a.credits - b.credits;
    
    // Foundation first, then by complexity
    if (a.pool === 'Orientierungsphase' && b.pool !== 'Orientierungsphase') return -1;
    if (b.pool === 'Orientierungsphase' && a.pool !== 'Orientierungsphase') return 1;
    return a.credits - b.credits;
  });

  const distribution: Record<string, Array<any>> = {};
  
  // Initialize semesters
  for (let i = 1; i <= semesterCount; i++) {
    distribution[`Semester ${i}`] = [];
  }

  // Distribute modules with bin-packing algorithm
  for (const module of sortedModules) {
    let placed = false;
    
    for (let sem = 1; sem <= semesterCount && !placed; sem++) {
      const semKey = `Semester ${sem}`;
      const currentCredits = distribution[semKey].reduce((sum, item) => sum + item.credits, 0);
      
      if (currentCredits + module.credits <= maxCreditsPerSemester) {
        distribution[semKey].push({
          module,
          credits: module.credits,
          priority: calculateModulePriority(module)
        });
        placed = true;
      }
    }
    
    // Fallback: place in last semester
    if (!placed) {
      distribution[`Semester ${semesterCount}`].push({
        module,
        credits: module.credits,
        priority: calculateModulePriority(module)
      });
    }
  }

  return distribution;
}

function generateStudyInsights(userModules: Array<any>, studyPlans: Array<any>) {
  const insights = [];
  const completed = userModules.filter(um => um.status === 'COMPLETED');
  const averageGrade = calculateAverageGrade(userModules);

  // Performance insights
  if (completed.length > 0 && averageGrade) {
    if (averageGrade <= 2.0) {
      insights.push({
        type: 'performance',
        title: 'Outstanding Performance',
        description: `Average grade: ${averageGrade.toFixed(1)}. Consider challenging modules.`,
        priority: 'low',
        actionable: true
      });
    } else if (averageGrade > 3.0) {
      insights.push({
        type: 'performance', 
        title: 'Academic Support Recommended',
        description: `Average grade: ${averageGrade.toFixed(1)}. Consider reducing workload.`,
        priority: 'high',
        actionable: true
      });
    }
  }

  // Planning insights
  if (studyPlans.length === 0) {
    insights.push({
      type: 'planning',
      title: 'Create Your Study Plan',
      description: 'Structure your studies with a personalized study plan.',
      priority: 'medium',
      actionable: true
    });
  }

  // Progress insights
  const inProgress = userModules.filter(um => um.status === 'IN_PROGRESS');
  if (inProgress.length > 4) {
    insights.push({
      type: 'workload',
      title: 'High Workload Alert',
      description: `${inProgress.length} modules in progress. Consider workload balance.`,
      priority: 'high',
      actionable: true
    });
  }

  return insights;
}

// Helper functions
function calculateAverageGrade(userModules: Array<{ grade: number | null; status: string }>): number | null {
  const grades = userModules
    .filter(um => um.status === 'COMPLETED' && um.grade !== null)
    .map(um => um.grade!);
  
  return grades.length > 0 ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : null;
}

function extractCategory(modulePool: string): string {
  // Extract category from modulePool identifier
  return modulePool.split(/[0-9]/)[0] || 'UNKNOWN';
}

function inferPrerequisites(module: typeof modules.$inferSelect): string[] {
  const prerequisites: string[] = [];
  
  if (module.code.includes('2') || module.name.includes('2')) {
    prerequisites.push('Foundation modules recommended');
  }
  
  if (module.category === 'INF' && module.credits >= 6) {
    prerequisites.push('Programming knowledge required');
  }
  
  if (module.name.toLowerCase().includes('advanced') || module.name.includes('Machine Learning')) {
    prerequisites.push('Advanced level required');
  }
  
  return prerequisites;
}

function calculateRecommendedSemester(module: typeof modules.$inferSelect, userProgress: number): number {
  if (module.pool === 'Orientierungsphase') return 1;
  if (module.pool === 'IT Vertiefung') return Math.max(2, Math.ceil(userProgress / 3));
  return Math.max(3, Math.ceil(userProgress / 2));
}

function calculateModulePriority(module: typeof modules.$inferSelect): number {
  if (module.pool === 'Orientierungsphase') return 5;
  if (module.pool === 'IT Vertiefung') return 4;
  if (module.category === 'INF') return 3;
  if (module.category === 'MAN') return 2;
  return 1;
}

export default router; 