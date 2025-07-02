import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import moduleRoutes from './routes/modules';
import studyPlanRoutes from './routes/studyPlans';

const app = express();
const port = process.env.PORT || 3000;

// Compression middleware
app.use(compression());

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://janniklasbenn.de'] //
        : [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5173',
          ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/auth', authRoutes);
app.use('/modules', moduleRoutes);
app.use('/study-plans', studyPlanRoutes);

app.get('/', (req, res) => {
  res.json({ 
    message: 'StudyPath API is running!',
    version: '1.0.0',
    description: 'THM DMS Studienplaner mit KI Unterstützung',
    endpoints: {
      auth: {
        'POST /auth/register': 'Register new user',
        'POST /auth/login': 'Login user',
        'GET /auth/me': 'Get current user info',
        'POST /auth/refresh': 'Refresh JWT token'
      },
      modules: {
        'GET /modules': 'Get all THM modules with filtering',
        'GET /modules/:pool': 'Get specific module by pool',
        'GET /modules/meta/categories': 'Get all module categories',
        'POST /modules/:pool/enroll': 'Enroll in module',
        'PUT /modules/:pool/progress': 'Update module progress',
        'DELETE /modules/:pool/unenroll': 'Unenroll from module',
        'GET /modules/my/enrolled': 'Get user enrolled modules'
      },
      studyPlans: {
        'GET /study-plans': 'Get all user study plans',
        'POST /study-plans': 'Create new study plan',
        'GET /study-plans/:id': 'Get study plan with modules',
        'PUT /study-plans/:id': 'Update study plan',
        'DELETE /study-plans/:id': 'Delete study plan',
        'POST /study-plans/:id/modules': 'Add module to study plan',
        'PUT /study-plans/:id/modules/:pool': 'Update module in study plan',
        'DELETE /study-plans/:id/modules/:pool': 'Remove module from study plan',
        'GET /study-plans/:id/summary': 'Get study plan statistics'
      }
    },
    database: {
      moduleCount: '96 THM modules available',
      pools: ['Orientierungsphase', 'IT Vertiefung', 'Überfachlicher Pool', 'Wahlpflichtpool']
    }
  });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(globalErrorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
