import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function authorize(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Role '${req.user.role}' is not allowed. Required: ${roles.join(', ')}`));
    }
    next();
  };
}
