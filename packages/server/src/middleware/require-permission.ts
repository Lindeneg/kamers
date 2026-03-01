import type {Request, Response, NextFunction, RequestHandler} from "express";
import {hasAllPermissions, type Permission} from "@kamers/shared";
import {HttpException} from "../lib/http-exception";
import type UserPermissionRepository from "../repositories/user-permission-repository";

export type CreateRequirePermission = (permission: Permission | Permission[]) => RequestHandler;

export function createRequirePermission(userPermissionRepo: UserPermissionRepository) {
    return (permission: Permission | Permission[]) => {
        const permissions = Array.isArray(permission) ? permission : [permission];
        return async (req: Request, _res: Response, next: NextFunction) => {
            if (!req.auth) {
                return next(HttpException.unauthorized());
            }

            const result = await userPermissionRepo.getPermissionsForUser(req.auth.userId);
            if (!result.ok) {
                return next(HttpException.internal());
            }

            if (!hasAllPermissions(result.data, permissions)) {
                return next(HttpException.forbidden());
            }

            next();
        };
    };
}
