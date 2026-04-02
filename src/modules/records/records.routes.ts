/**
 * @swagger
 * tags:
 *   name: Records
 *   description: Financial records management
 *
 * /api/records:
 *   get:
 *     tags: [Records]
 *     summary: List records with filters and pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: min_amount
 *         schema: { type: number }
 *       - in: query
 *         name: max_amount
 *         schema: { type: number }
 *       - in: query
 *         name: sort_by
 *         schema: { type: string, enum: [date, amount] }
 *       - in: query
 *         name: sort_order
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200: { description: Paginated records }
 *   post:
 *     tags: [Records]
 *     summary: Create a record (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount: { type: number }
 *               type: { type: string, enum: [income, expense] }
 *               category: { type: string }
 *               date: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Record created }
 *
 * /api/records/{id}:
 *   get:
 *     tags: [Records]
 *     summary: Get record by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Record found }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Records]
 *     summary: Update record (admin only)
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
 *               amount: { type: number }
 *               type: { type: string }
 *               category: { type: string }
 *               date: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Record updated }
 *   delete:
 *     tags: [Records]
 *     summary: Soft delete record (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Record deleted }
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { apiLimiter } from '../../middleware/rateLimiter';
import * as ctrl from './records.controller';

const router = Router();

router.use(authenticate, apiLimiter);

// All authenticated roles can read
router.get('/', ctrl.listRecords);
router.get('/:id', ctrl.getRecord);

// Admin only for mutations
router.post('/', authorize('admin'), ctrl.createRecord);
router.patch('/:id', authorize('admin'), ctrl.updateRecord);
router.delete('/:id', authorize('admin'), ctrl.deleteRecord);

export default router;
