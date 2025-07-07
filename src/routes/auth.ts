import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users, userModules, studyPlans } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateToken, authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const registerSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).max(100).required(),
  }),
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

// POST /auth/register
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      res.status(409).json({
        success: false,
        error: {
          message: 'User with this email already exists',
        },
      });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
      });

    // Generate JWT token
    const token = generateToken(newUser[0].id, newUser[0].email);

    res.status(201).json({
      success: true,
      data: {
        user: newUser[0],
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during registration',
      },
    });
  }
});

// POST /auth/login
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
        },
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      password,
      user[0].passwordHash
    );

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
        },
      });
      return;
    }

    // Generate JWT token
    const token = generateToken(user[0].id, user[0].email);

    res.json({
      success: true,
      data: {
        user: {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name,
          createdAt: user[0].createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during login',
      },
    });
  }
});

// GET /auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // This endpoint requires authentication middleware to be added in main app
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
      },
    });
  }
});

// POST /auth/refresh
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
        },
      });
      return;
    }

    // Generate new token
    const token = generateToken(req.user.id, req.user.email);

    res.json({
      success: true,
      data: {
        token,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during token refresh',
      },
    });
  }
});

// GET /auth/stats - Get user progress statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get user module statistics
    const userModuleStats = await db
      .select()
      .from(userModules)
      .where(eq(userModules.userId, userId));

    // Get user study plan count
    const userStudyPlanCount = await db
      .select()
      .from(studyPlans)
      .where(eq(studyPlans.userId, userId));

    // Calculate statistics
    const completedModules = userModuleStats.filter(um => um.status === 'COMPLETED');
    const inProgressModules = userModuleStats.filter(um => um.status === 'IN_PROGRESS');
    const plannedModules = userModuleStats.filter(um => um.status === 'PLANNED');

    // Calculate average grade
    const gradesWithValues = completedModules
      .filter(um => um.grade !== null)
      .map(um => um.grade!);
    
    const averageGrade = gradesWithValues.length > 0 
      ? gradesWithValues.reduce((sum, grade) => sum + grade, 0) / gradesWithValues.length 
      : null;

    res.json({
      success: true,
      data: {
        modules: {
          total: userModuleStats.length,
          completed: completedModules.length,
          inProgress: inProgressModules.length,
          planned: plannedModules.length,
          averageGrade: averageGrade ? Math.round(averageGrade * 10) / 10 : null
        },
        studyPlans: {
          total: userStudyPlanCount.length
        },
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    });
  }
});

export default router;
