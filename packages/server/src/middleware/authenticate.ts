import type {Request, Response, NextFunction} from "express";
import {HttpException} from "../lib/http-exception";
import type AuthService from "../services/auth-service";

export function createAuthenticate(authService: AuthService) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const token = req.cookies?.access_token;
        if (!token) {
            return next(HttpException.unauthorized());
        }

        const result = authService.verifyAccessToken(token);
        if (!result.ok) {
            return next(HttpException.unauthorized());
        }

        req.auth = {
            userId: result.data.userId,
            tenantId: result.data.tenantId,
        };

        next();
    };
}
