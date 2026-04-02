import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as recordsService from './records.service';
import { createRecordSchema, updateRecordSchema, listRecordsSchema } from './records.schema';
import { success, paginated } from '../../utils/response';

export async function listRecords(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const query = listRecordsSchema.parse(req.query);
    const { records, total } = await recordsService.listRecords(query);
    paginated(res, records, query.page, query.limit, total);
  } catch (err) { next(err); }
}

export async function getRecord(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const record = await recordsService.getRecordById(req.params['id'] as string);
    success(res, record);
  } catch (err) { next(err); }
}

export async function createRecord(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = createRecordSchema.parse(req.body);
    const record = await recordsService.createRecord(req.user!.userId, input);
    success(res, record, 201);
  } catch (err) { next(err); }
}

export async function updateRecord(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = updateRecordSchema.parse(req.body);
    const record = await recordsService.updateRecord(req.params['id'] as string, input);
    success(res, record);
  } catch (err) { next(err); }
}

export async function deleteRecord(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const record = await recordsService.deleteRecord(req.params['id'] as string);
    success(res, record);
  } catch (err) { next(err); }
}
