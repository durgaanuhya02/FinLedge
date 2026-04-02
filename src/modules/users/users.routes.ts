/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management (admin only)
 *
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (paginated)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [viewer, analyst, admin] }
 *     responses:
 *       200: { description: Paginated user list }
 *
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User found }
 *       404: { description: User not found }
 *   patch:
 *     tags: [Users]
 *     summary: Update user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               status: { type: string, enum: [active, inactive] }
 *               role: { type: string, enum: [viewer, analyst, admin] }
 *     responses:
 *       200: { description: User updated }
 *   delete:
 *     tags: [Users]
 *     summary: Soft delete user (set inactive)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deactivated }
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { apiLimiter } from '../../middleware/rateLimiter';
import * as ctrl from './users.controller';

const router = Router();

router.use(authenticate, authorize('admin'), apiLimiter);

router.get('/', ctrl.listUsers);
router.get('/:id', ctrl.getUser);
router.patch('/:id', ctrl.updateUser);
router.delete('/:id', ctrl.deleteUser);

export default router;
