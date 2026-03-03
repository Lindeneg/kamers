import type {Request, Response, NextFunction} from "express";
import {HttpException} from "../lib/http-exception";
import type AuthService from "../services/auth-service";
import type UserRepository from "../repositories/user-repository";

export function createAuthenticate(authService: AuthService, userRepo: UserRepository) {
    return async (req: Request, _res: Response, next: NextFunction) => {
        const token = req.cookies?.access_token;
        if (!token) {
            return next(HttpException.unauthorized());
        }

        const result = authService.verifyAccessToken(token);
        if (!result.ok) {
            return next(HttpException.unauthorized());
        }

        const userResult = await userRepo.findById(result.data.userId);
        if (!userResult.ok || !userResult.data || !userResult.data.isActive || userResult.data.deletedAt) {
            return next(HttpException.unauthorized());
        }

        req.auth = {
            userId: result.data.userId,
            tenantId: result.data.tenantId,
        };

        next();
    };
}
