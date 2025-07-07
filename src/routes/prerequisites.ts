import { Router } from 'express';
import { db } from '../db';
import { modulePrerequisites, modules, userModules } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { getSuggestedEnrollmentOrder } from '../services/prerequisitesService';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createPrerequisiteSchema = {
  body: Joi.object({
    modulePool: Joi.string().required(),
    prerequisitePool: Joi.string().required(),
    isRequired: Joi.boolean().default(true),
    description: Joi.string().max(500).optional(),
  }),
};

const updatePrerequisiteSchema = {
  body: Joi.object({
    isRequired: Joi.boolean().optional(),
    description: Joi.string().max(500).optional(),
  }),
};

// GET /prerequisites/:modulePool - Get prerequisites for a specific module
router.get('/:modulePool', async (req, res) => {
  try {
    const { modulePool } = req.params;

    // Verify module exists
    const module = await db
      .select()
      .from(modules)
      .where(eq(modules.pool, modulePool))
      .limit(1);

    if (module.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Module not found',
        },
      });
      return;
    }

    // Get prerequisites with module details
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

    res.json({
      success: true,
      data: {
        module: module[0],
        prerequisites,
      },
    });
  } catch (error) {
    console.error('Get prerequisites error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

// GET /prerequisites/:modulePool/dependents - Get modules that depend on this module
router.get('/:modulePool/dependents', async (req, res) => {
  try {
    const { modulePool } = req.params;

    // Verify module exists
    const module = await db
      .select()
      .from(modules)
      .where(eq(modules.pool, modulePool))
      .limit(1);

    if (module.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Module not found',
        },
      });
      return;
    }

    // Get dependent modules
    const dependents = await db
      .select({
        prerequisite: modulePrerequisites,
        dependentModule: modules,
      })
      .from(modulePrerequisites)
      .innerJoin(modules, eq(modulePrerequisites.modulePool, modules.pool))
      .where(eq(modulePrerequisites.prerequisitePool, modulePool));

    res.json({
      success: true,
      data: {
        module: module[0],
        dependents,
      },
    });
  } catch (error) {
    console.error('Get dependents error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

// GET /prerequisites/:modulePool/status - Check prerequisite fulfillment for user
router.get('/:modulePool/status', authenticateToken, async (req, res) => {
  try {
    const { modulePool } = req.params;
    const userId = req.user!.id;

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

    // Get user's completed modules
    const userCompletedModules = await db
      .select({ modulePool: userModules.modulePool })
      .from(userModules)
      .where(
        and(eq(userModules.userId, userId), eq(userModules.status, 'COMPLETED'))
      );

    const completedPools = userCompletedModules.map((um) => um.modulePool);

    // Check prerequisite fulfillment
    const prerequisiteStatus = prerequisites.map((prereq) => ({
      ...prereq,
      isFulfilled: completedPools.includes(prereq.prerequisite.prerequisitePool),
    }));

    const requiredPrerequisites = prerequisiteStatus.filter(
      (p) => p.prerequisite.isRequired
    );
    const allRequiredFulfilled = requiredPrerequisites.every(
      (p) => p.isFulfilled
    );

    res.json({
      success: true,
      data: {
        modulePool,
        canEnroll: allRequiredFulfilled,
        prerequisites: prerequisiteStatus,
        summary: {
          total: prerequisites.length,
          required: requiredPrerequisites.length,
          fulfilled: prerequisiteStatus.filter((p) => p.isFulfilled).length,
          requiredFulfilled: requiredPrerequisites.filter((p) => p.isFulfilled)
            .length,
        },
      },
    });
  } catch (error) {
    console.error('Check prerequisite status error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

// POST /prerequisites - Create new prerequisite relationship (admin only)
router.post(
  '/',
  authenticateToken,
  validateRequest(createPrerequisiteSchema),
  async (req, res) => {
    try {
      const { modulePool, prerequisitePool, isRequired = true, description } =
        req.body;

      // Verify both modules exist
      const [module, prerequisiteModule] = await Promise.all([
        db.select().from(modules).where(eq(modules.pool, modulePool)).limit(1),
        db
          .select()
          .from(modules)
          .where(eq(modules.pool, prerequisitePool))
          .limit(1),
      ]);

      if (module.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Target module not found',
          },
        });
        return;
      }

      if (prerequisiteModule.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Prerequisite module not found',
          },
        });
        return;
      }

      // Check if prerequisite relationship already exists
      const existingPrerequisite = await db
        .select()
        .from(modulePrerequisites)
        .where(
          and(
            eq(modulePrerequisites.modulePool, modulePool),
            eq(modulePrerequisites.prerequisitePool, prerequisitePool)
          )
        )
        .limit(1);

      if (existingPrerequisite.length > 0) {
        res.status(409).json({
          success: false,
          error: {
            message: 'Prerequisite relationship already exists',
          },
        });
        return;
      }

      // Create prerequisite relationship
      const newPrerequisite = await db
        .insert(modulePrerequisites)
        .values({
          modulePool,
          prerequisitePool,
          isRequired,
          description,
        })
        .returning();

      res.status(201).json({
        success: true,
        data: {
          prerequisite: newPrerequisite[0],
          module: module[0],
          prerequisiteModule: prerequisiteModule[0],
        },
      });
    } catch (error) {
      console.error('Create prerequisite error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
        },
      });
    }
  }
);

// PUT /prerequisites/:id - Update prerequisite relationship (admin only)
router.put(
  '/:id',
  authenticateToken,
  validateRequest(updatePrerequisiteSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if prerequisite exists
      const existingPrerequisite = await db
        .select()
        .from(modulePrerequisites)
        .where(eq(modulePrerequisites.id, id))
        .limit(1);

      if (existingPrerequisite.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Prerequisite relationship not found',
          },
        });
        return;
      }

      // Update prerequisite
      const updatedPrerequisite = await db
        .update(modulePrerequisites)
        .set(updateData)
        .where(eq(modulePrerequisites.id, id))
        .returning();

      res.json({
        success: true,
        data: {
          prerequisite: updatedPrerequisite[0],
        },
      });
    } catch (error) {
      console.error('Update prerequisite error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
        },
      });
    }
  }
);

// DELETE /prerequisites/:id - Remove prerequisite relationship (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPrerequisite = await db
      .delete(modulePrerequisites)
      .where(eq(modulePrerequisites.id, id))
      .returning();

    if (deletedPrerequisite.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Prerequisite relationship not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: 'Prerequisite relationship deleted successfully',
      },
    });
  } catch (error) {
    console.error('Delete prerequisite error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

// POST /prerequisites/suggest-order - Get suggested enrollment order for modules
router.post('/suggest-order', validateRequest({
  body: Joi.object({
    modulePools: Joi.array().items(Joi.string()).min(1).required(),
  }),
}), async (req, res) => {
  try {
    const { modulePools } = req.body;

    // Note: In production, validate that all modules exist first

    const suggestions = await getSuggestedEnrollmentOrder(modulePools);

    res.json({
      success: true,
      data: {
        suggestions,
        totalModules: modulePools.length,
      },
    });
  } catch (error) {
    console.error('Get enrollment suggestions error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

export default router;