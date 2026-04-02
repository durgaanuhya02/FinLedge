import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import * as usersService from './users.service';
import { updateUserSchema, listUsersSchema } from './users.schema';
import { success, paginated } from '../../utils/response';

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const query = listUsersSchema.parse(req.query);
    const { users, total } = await usersService.listUsers(query);
    paginated(res, users, query.page, query.limit, total);
  } catch (err) { next(err); }
}

export async function getUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await usersService.getUserById(req.params['id'] as string);
    success(res, user);
  } catch (err) { next(err); }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = updateUserSchema.parse(req.body);
    const user = await usersService.updateUser(req.params['id'] as string, req.user!.userId, input);
    success(res, user);
  } catch (err) { next(err); }
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await usersService.deleteUser(req.params['id'] as string, req.user!.userId);
    success(res, user);
  } catch (err) { next(err); }
}
