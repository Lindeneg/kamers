import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import type {Response} from "express";
import {success, failure, type Result} from "@kamers/shared";
import type EnvService from "./env-service";
import type LoggerService from "./logger-service";

export interface AuthServiceOpts {
    saltRounds: number;
    accessTokenExpiryMs: number;
    refreshTokenExpiryMs: number;
    inviteTokenExpiryMs: number;
}

export type AccessTokenPayload = {
    userId: string;
    tenantId: string;
};

export type RefreshTokenPayload = {
    sessionId: string;
    userId: string;
};

class AuthService {
    constructor(
        private readonly env: EnvService,
        private readonly opts: AuthServiceOpts,
        private readonly log: LoggerService
    ) {}

    async hashPassword(password: string): Promise<Result<string>> {
        try {
            const hash = await bcrypt.hash(password, this.opts.saltRounds);
            return success(hash);
        } catch (err) {
            this.log.error(err, "failed to hash password");
            return failure("failed to hash password");
        }
    }

    async comparePassword(password: string, hash: string): Promise<Result<boolean>> {
        try {
            const match = await bcrypt.compare(password, hash);
            return success(match);
        } catch (err) {
            this.log.error(err, "failed to compare password");
            return failure("failed to compare password");
        }
    }

    generateAccessToken(payload: AccessTokenPayload): Result<string> {
        try {
            const token = jwt.sign(payload, this.env.jwtAccessSecret, {
                expiresIn: Math.floor(this.opts.accessTokenExpiryMs / 1000),
            });
            return success(token);
        } catch (err) {
            this.log.error(err, "failed to generate access token");
            return failure("failed to generate access token");
        }
    }

    verifyAccessToken(token: string): Result<AccessTokenPayload> {
        try {
            const payload = jwt.verify(token, this.env.jwtAccessSecret) as AccessTokenPayload;
            return success(payload);
        } catch (err) {
            this.log.error(err, "invalid or expired access token");
            return failure("invalid or expired access token");
        }
    }

    generateRefreshToken(payload: RefreshTokenPayload): Result<string> {
        try {
            const token = jwt.sign(payload, this.env.jwtRefreshSecret, {
                expiresIn: Math.floor(this.opts.refreshTokenExpiryMs / 1000),
            });
            return success(token);
        } catch (err) {
            this.log.error(err, "failed to generate refresh token");
            return failure("failed to generate refresh token");
        }
    }

    verifyRefreshToken(token: string): Result<RefreshTokenPayload> {
        try {
            const payload = jwt.verify(token, this.env.jwtRefreshSecret) as RefreshTokenPayload;
            return success(payload);
        } catch (err) {
            this.log.error(err, "invalid or expired refresh token");
            return failure("invalid or expired refresh token");
        }
    }

    generateOpaqueToken(): string {
        return crypto.randomBytes(32).toString("hex");
    }

    getRefreshTokenExpiry(): Date {
        return new Date(Date.now() + this.opts.refreshTokenExpiryMs);
    }

    getInviteTokenExpiry(): Date {
        return new Date(Date.now() + this.opts.inviteTokenExpiryMs);
    }

    setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
        const secure = this.env.prod;
        const sameSite = "lax" as const;
        res.cookie("access_token", accessToken, {
            httpOnly: true,
            secure,
            sameSite,
            maxAge: this.opts.accessTokenExpiryMs,
        });
        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure,
            sameSite,
            path: "/api/auth/refresh",
            maxAge: this.opts.refreshTokenExpiryMs,
        });
    }

    clearAuthCookies(res: Response): void {
        res.clearCookie("access_token");
        res.clearCookie("refresh_token", {path: "/api/auth/refresh"});
    }
}

export default AuthService;
