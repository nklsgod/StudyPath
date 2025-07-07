import { Router } from 'express';
import { db } from '../db';
import { modules, userModules, users } from '../db/schema';
import { eq, like, and, or } from 'drizzle-orm';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { validatePrerequisites } from '../services/prerequisitesService';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createUserModuleSchema = {
  body: Joi.object({
    modulePool: Joi.string().required(),
    status: Joi.string()
      .valid('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')
      .default('PLANNED'),
    grade: Joi.number().min(1.0).max(5.0).optional(),
    semester: Joi.string().optional(),
    notes: Joi.string().max(1000).optional(),
  }),
  query: Joi.object({
    skipPrerequisiteCheck: Joi.boolean().default(false),
  }),
};

const updateUserModuleSchema = {
  body: Joi.object({
    status: Joi.string()
      .valid('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')
      .optional(),
    grade: Joi.number().min(1.0).max(5.0).optional(),
    semester: Joi.string().optional(),
    notes: Joi.string().max(1000).optional(),
  }),
};

// GET /modules - Get all THM modules with optional filtering
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { pool, search, category, limit = '50', offset = '0' } = req.query;

    // Build base query
    let baseQuery = db.select().from(modules);

    // Build where conditions
    const whereConditions = [];

    if (pool && typeof pool === 'string') {
      whereConditions.push(like(modules.pool, `%${pool}%`));
    }

    if (category && typeof category === 'string') {
      whereConditions.push(eq(modules.category, category));
    }

    if (search && typeof search === 'string') {
      whereConditions.push(
        or(
          like(modules.name, `%${search}%`),
          like(modules.code, `%${search}%`),
          like(modules.pool, `%${search}%`)
        )
      );
    }

    // Apply where conditions if any
    let query =
      whereConditions.length > 0
        ? baseQuery.where(and(...whereConditions))
        : baseQuery;

    // Add pagination
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;

    const result = await query
      .limit(limitNum)
      .offset(offsetNum)
      .orderBy(modules.pool);

    res.json({
      success: true,
      data: {
        modules: result,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: result.length,
        },
      },
    });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

// GET /modules/:pool - Get specific module by pool
router.get('/:pool', optionalAuth, async (req, res) => {
  try {
    const { pool } = req.params;

    const module = await db
      .select()
      .from(modules)
      .where(eq(modules.pool, pool))
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

    res.json({
      success: true,
      data: {
        module: module[0],
      },
    });
  } catch (error) {
    console.error('Get module error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

// GET /modules/categories - Get all available categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await db
      .selectDistinct({ category: modules.category })
      .from(modules)
      .orderBy(modules.category);

    res.json({
      success: true,
      data: {
        categories: categories.map((c) => c.category),
      },
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

// POST /modules/:pool/enroll - Enroll user in a module
router.post(
  '/:pool/enroll',
  authenticateToken,
  validateRequest(createUserModuleSchema),
  async (req, res) => {
    try {
      const { pool } = req.params;
      const { status = 'PLANNED', grade, semester, notes } = req.body;
      const userId = req.user!.id;

      // Check if module exists
      const module = await db
        .select()
        .from(modules)
        .where(eq(modules.pool, pool))
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

      // Check if user is already enrolled
      const existingEnrollment = await db
        .select()
        .from(userModules)
        .where(
          and(eq(userModules.userId, userId), eq(userModules.modulePool, pool))
        )
        .limit(1);

      if (existingEnrollment.length > 0) {
        res.status(409).json({
          success: false,
          error: {
            message: 'User is already enrolled in this module',
          },
        });
        return;
      }

      // Check prerequisites unless explicitly skipped
      const { skipPrerequisiteCheck = false } = req.query;
      let prerequisiteValidation = null;

      if (!skipPrerequisiteCheck && status !== 'COMPLETED') {
        try {
          prerequisiteValidation = await validatePrerequisites(userId, pool);
          
          if (!prerequisiteValidation.canEnroll) {
            res.status(422).json({
              success: false,
              error: {
                message: 'Cannot enroll due to unmet prerequisites',
                details: {
                  validation: prerequisiteValidation,
                  hint: 'Complete required prerequisites first, or use ?skipPrerequisiteCheck=true to override',
                },
              },
            });
            return;
          }
        } catch (error) {
          console.error('Prerequisite validation error:', error);
          // Continue with enrollment if validation fails (fallback behavior)
        }
      }

      // Create user module enrollment
      const newUserModule = await db
        .insert(userModules)
        .values({
          userId,
          modulePool: pool,
          status,
          grade,
          semester,
          notes,
          completedAt: status === 'COMPLETED' ? new Date() : null,
        })
        .returning();

      res.status(201).json({
        success: true,
        data: {
          userModule: newUserModule[0],
          module: module[0],
          prerequisiteValidation,
        },
      });
    } catch (error) {
      console.error('Enroll module error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
        },
      });
    }
  }
);

// PUT /modules/:pool/progress - Update user's module progress
router.put(
  '/:pool/progress',
  authenticateToken,
  validateRequest(updateUserModuleSchema),
  async (req, res) => {
    try {
      const { pool } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      // Check if user is enrolled in module
      const userModule = await db
        .select()
        .from(userModules)
        .where(
          and(eq(userModules.userId, userId), eq(userModules.modulePool, pool))
        )
        .limit(1);

      if (userModule.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'User is not enrolled in this module',
          },
        });
        return;
      }

      // Update completion date if status is completed
      if (updateData.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (updateData.status && updateData.status !== 'COMPLETED') {
        updateData.completedAt = null;
      }

      // Update user module
      const updatedUserModule = await db
        .update(userModules)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(
          and(eq(userModules.userId, userId), eq(userModules.modulePool, pool))
        )
        .returning();

      res.json({
        success: true,
        data: {
          userModule: updatedUserModule[0],
        },
      });
    } catch (error) {
      console.error('Update module progress error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
        },
      });
    }
  }
);

// DELETE /modules/:pool/unenroll - Unenroll user from module
router.delete('/:pool/unenroll', authenticateToken, async (req, res) => {
  try {
    const { pool } = req.params;
    const userId = req.user!.id;

    const deletedUserModule = await db
      .delete(userModules)
      .where(
        and(eq(userModules.userId, userId), eq(userModules.modulePool, pool))
      )
      .returning();

    if (deletedUserModule.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          message: 'User is not enrolled in this module',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: 'Successfully unenrolled from module',
      },
    });
  } catch (error) {
    console.error('Unenroll module error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

// GET /modules/my/enrolled - Get all modules user is enrolled in
router.get('/my/enrolled', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { status } = req.query;

    // Build where conditions
    const whereConditions = [eq(userModules.userId, userId)];

    if (status && typeof status === 'string') {
      whereConditions.push(eq(userModules.status, status as any));
    }

    const result = await db
      .select({
        userModule: userModules,
        module: modules,
      })
      .from(userModules)
      .innerJoin(modules, eq(userModules.modulePool, modules.pool))
      .where(and(...whereConditions))
      .orderBy(userModules.createdAt);

    res.json({
      success: true,
      data: {
        enrollments: result,
      },
    });
  } catch (error) {
    console.error('Get user modules error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

export default router;
