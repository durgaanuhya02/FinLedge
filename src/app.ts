import './config/env'; // load env first
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import './config/passport'; // register passport strategies

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import recordsRoutes from './modules/records/records.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';

const app = express();

app.use(express.json());

// API Docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'FinLedger' }));

// Global error handler (must be last)
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '3000', 10);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`FinLedger running on http://localhost:${PORT}`);
    console.log(`API Docs: http://localhost:${PORT}/api/docs`);
  });
}

export default app;
