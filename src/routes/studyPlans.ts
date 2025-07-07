import { Router } from 'express';
import { db } from '../db';
import {
  studyPlans,
  studyPlanModules,
  modules,
  userModules,
} from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createStudyPlanSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional(),
    targetSemester: Joi.string().optional(),
    isActive: Joi.boolean().default(true),
  }),
};

const updateStudyPlanSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional(),
    targetSemester: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
  }),
};

const addModuleToStudyPlanSchema = {
  body: Joi.object({
    modulePool: Joi.string().required(),
    plannedSemester: Joi.string().required(),
    priority: Joi.number().min(1).max(10).default(1),
  }),
};

const updateStudyPlanModuleSchema = {
  body: Joi.object({
    plannedSemester: Joi.string().optional(),
    priority: Joi.number().min(1).max(10).optional(),
  }),
};

// GET /study-plans - Get all study plans for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { includeInactive = 'false' } = req.query;

    // Build where conditions
    const whereConditions = [eq(studyPlans.userId, userId)];

    // Filter active plans only unless explicitly requested
    if (includeInactive !== 'true') {
      whereConditions.push(eq(studyPlans.isActive, true));
    }

    const plans = await db
      .select()
      .from(studyPlans)
      .where(and(...whereConditions))
      .orderBy(desc(studyPlans.createdAt));

    res.json({
      success: true,
      data: {
        studyPlans: plans,
      },
    });
  } catch (error) {
    console.error('Get study plans error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

// POST /study-plans - Create new study plan
router.post(
  '/',
  authenticateToken,
  validateRequest(createStudyPlanSchema),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { name, description, targetSemester, isActive = true } = req.body;

      const newStudyPlan = await db
        .insert(studyPlans)
        .values({
          userId,
          name,
          description,
          targetSemester,
          isActive,
        })
        .returning();

      res.status(201).json({
        success: true,
        data: {
          studyPlan: newStudyPlan[0],
        },
      });
    } catch (error) {
      console.error('Create study plan error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
        },
      });
    }
  }
);

// GET /study-plans/:id - Get specific study plan with modules
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get study plan
    const studyPlan = await db
      .select()
      .from(studyPlans)
      .where(and(eq(studyPlans.id, id), eq(studyPlans.userId, userId)))
      .limit(1);

    if (studyPlan.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Study plan not found',
        },
      });
      return;
    }

    // Get modules in this study plan
    const planModules = await db
      .select({
        studyPlanModule: studyPlanModules,
        module: modules,
      })
      .from(studyPlanModules)
      .innerJoin(modules, eq(studyPlanModules.modulePool, modules.pool))
      .where(eq(studyPlanModules.studyPlanId, id))
      .orderBy(studyPlanModules.plannedSemester, studyPlanModules.priority);

    res.json({
      success: true,
      data: {
        studyPlan: studyPlan[0],
        modules: planModules,
      },
    });
  } catch (error) {
    console.error('Get study plan error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

// PUT /study-plans/:id - Update study plan
router.put(
  '/:id',
  authenticateToken,
  validateRequest(updateStudyPlanSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      // Check if study plan exists and belongs to user
      const existingPlan = await db
        .select()
        .from(studyPlans)
        .where(and(eq(studyPlans.id, id), eq(studyPlans.userId, userId)))
        .limit(1);

      if (existingPlan.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Study plan not found',
          },
        });
        return;
      }

      const updatedStudyPlan = await db
        .update(studyPlans)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(studyPlans.id, id), eq(studyPlans.userId, userId)))
        .returning();

      res.json({
        success: true,
        data: {
          studyPlan: updatedStudyPlan[0],
        },
      });
    } catch (error) {
      console.error('Update study plan error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
        },
      });
    }
  }
);

// DELETE /study-plans/:id - Delete study plan
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const deletedStudyPlan = await db
      .delete(studyPlans)
      .where(and(eq(studyPlans.id, id), eq(studyPlans.userId, userId)))
      .returning();

    if (deletedStudyPlan.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Study plan not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: 'Study plan deleted successfully',
      },
    });
  } catch (error) {
    console.error('Delete study plan error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

// POST /study-plans/:id/modules - Add module to study plan
router.post(
  '/:id/modules',
  authenticateToken,
  validateRequest(addModuleToStudyPlanSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { modulePool, plannedSemester, priority = 1 } = req.body;

      // Check if study plan exists and belongs to user
      const studyPlan = await db
        .select()
        .from(studyPlans)
        .where(and(eq(studyPlans.id, id), eq(studyPlans.userId, userId)))
        .limit(1);

      if (studyPlan.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Study plan not found',
          },
        });
        return;
      }

      // Check if module exists
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

      // Check if module is already in this study plan
      const existingPlanModule = await db
        .select()
        .from(studyPlanModules)
        .where(
          and(
            eq(studyPlanModules.studyPlanId, id),
            eq(studyPlanModules.modulePool, modulePool)
          )
        )
        .limit(1);

      if (existingPlanModule.length > 0) {
        res.status(409).json({
          success: false,
          error: {
            message: 'Module is already in this study plan',
          },
        });
        return;
      }

      const newPlanModule = await db
        .insert(studyPlanModules)
        .values({
          studyPlanId: id,
          modulePool,
          plannedSemester,
          priority,
        })
        .returning();

      res.status(201).json({
        success: true,
        data: {
          studyPlanModule: newPlanModule[0],
          module: module[0],
        },
      });
    } catch (error) {
      console.error('Add module to study plan error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
        },
      });
    }
  }
);

// PUT /study-plans/:id/modules/:modulePool - Update module in study plan
router.put(
  '/:id/modules/:modulePool',
  authenticateToken,
  validateRequest(updateStudyPlanModuleSchema),
  async (req, res) => {
    try {
      const { id, modulePool } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      // Check if study plan exists and belongs to user
      const studyPlan = await db
        .select()
        .from(studyPlans)
        .where(and(eq(studyPlans.id, id), eq(studyPlans.userId, userId)))
        .limit(1);

      if (studyPlan.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Study plan not found',
          },
        });
        return;
      }

      // Check if module is in this study plan
      const planModule = await db
        .select()
        .from(studyPlanModules)
        .where(
          and(
            eq(studyPlanModules.studyPlanId, id),
            eq(studyPlanModules.modulePool, modulePool)
          )
        )
        .limit(1);

      if (planModule.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Module not found in this study plan',
          },
        });
        return;
      }

      const updatedPlanModule = await db
        .update(studyPlanModules)
        .set(updateData)
        .where(
          and(
            eq(studyPlanModules.studyPlanId, id),
            eq(studyPlanModules.modulePool, modulePool)
          )
        )
        .returning();

      res.json({
        success: true,
        data: {
          studyPlanModule: updatedPlanModule[0],
        },
      });
    } catch (error) {
      console.error('Update study plan module error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
        },
      });
    }
  }
);

// DELETE /study-plans/:id/modules/:modulePool - Remove module from study plan
router.delete(
  '/:id/modules/:modulePool',
  authenticateToken,
  async (req, res) => {
    try {
      const { id, modulePool } = req.params;
      const userId = req.user!.id;

      // Check if study plan exists and belongs to user
      const studyPlan = await db
        .select()
        .from(studyPlans)
        .where(and(eq(studyPlans.id, id), eq(studyPlans.userId, userId)))
        .limit(1);

      if (studyPlan.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Study plan not found',
          },
        });
        return;
      }

      const deletedPlanModule = await db
        .delete(studyPlanModules)
        .where(
          and(
            eq(studyPlanModules.studyPlanId, id),
            eq(studyPlanModules.modulePool, modulePool)
          )
        )
        .returning();

      if (deletedPlanModule.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Module not found in this study plan',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          message: 'Module removed from study plan successfully',
        },
      });
    } catch (error) {
      console.error('Remove module from study plan error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
        },
      });
    }
  }
);

// GET /study-plans/:id/summary - Get study plan summary with statistics
router.get('/:id/summary', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get study plan
    const studyPlan = await db
      .select()
      .from(studyPlans)
      .where(and(eq(studyPlans.id, id), eq(studyPlans.userId, userId)))
      .limit(1);

    if (studyPlan.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Study plan not found',
        },
      });
      return;
    }

    // Get modules with their completion status
    const planModulesQuery = await db
      .select({
        studyPlanModule: studyPlanModules,
        module: modules,
        userModule: userModules,
      })
      .from(studyPlanModules)
      .innerJoin(modules, eq(studyPlanModules.modulePool, modules.pool))
      .leftJoin(
        userModules,
        and(
          eq(userModules.modulePool, modules.pool),
          eq(userModules.userId, userId)
        )
      )
      .where(eq(studyPlanModules.studyPlanId, id));

    // Calculate statistics
    const totalModules = planModulesQuery.length;
    const totalCredits = planModulesQuery.reduce(
      (sum, item) => sum + item.module.credits,
      0
    );

    const completedModules = planModulesQuery.filter(
      (item) => item.userModule?.status === 'COMPLETED'
    ).length;

    const completedCredits = planModulesQuery
      .filter((item) => item.userModule?.status === 'COMPLETED')
      .reduce((sum, item) => sum + item.module.credits, 0);

    const inProgressModules = planModulesQuery.filter(
      (item) => item.userModule?.status === 'IN_PROGRESS'
    ).length;

    const plannedModules = planModulesQuery.filter(
      (item) => !item.userModule || item.userModule.status === 'PLANNED'
    ).length;

    // Group by semester
    const semesterGroups = planModulesQuery.reduce(
      (groups, item) => {
        const semester = item.studyPlanModule.plannedSemester;
        if (!groups[semester]) {
          groups[semester] = [];
        }
        groups[semester].push(item);
        return groups;
      },
      {} as Record<string, typeof planModulesQuery>
    );

    res.json({
      success: true,
      data: {
        studyPlan: studyPlan[0],
        statistics: {
          totalModules,
          totalCredits,
          completedModules,
          completedCredits,
          inProgressModules,
          plannedModules,
          completionPercentage:
            totalModules > 0
              ? Math.round((completedModules / totalModules) * 100)
              : 0,
          creditProgress:
            totalCredits > 0
              ? Math.round((completedCredits / totalCredits) * 100)
              : 0,
        },
        semesterGroups,
      },
    });
  } catch (error) {
    console.error('Get study plan summary error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

export default router;
