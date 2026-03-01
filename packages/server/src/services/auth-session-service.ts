import {
    success,
    emptySuccess,
    failure,
    type Result,
    type EmptyResult,
    type AuthResponse,
} from "@kamers/shared";
import type AuthService from "./auth-service.js";
import type UserRepository from "../repositories/user-repository.js";
import type SessionRepository from "../repositories/session-repository.js";
import type UserPermissionRepository from "../repositories/user-permission-repository";
import type AuditLogRepository from "../repositories/audit-log-repository.js";
import type DataService from "./data-service.js";

interface LoginInput {
    email: string;
    password: string;
}

interface SetPasswordInput {
    token: string;
    password: string;
}

interface RequestContext {
    userAgent?: string;
    ipAddress?: string;
}

type LoginResult = {
    accessToken: string;
    refreshToken: string;
};

type MeResult = AuthResponse["me"];

export const AuthSessionError = {
    INVALID_CREDENTIALS: "invalid_credentials",
    USER_NOT_FOUND: "user_not_found",
    USER_INACTIVE: "user_inactive",
    TOKEN_EXPIRED: "token_expired",
    TOKEN_NOT_FOUND: "token_not_found",
    SESSION_EXPIRED: "session_expired",
    NO_REFRESH_TOKEN: "no_refresh_token",
    DB_ERROR: "db_error",
} as const;

export type AuthSessionError = (typeof AuthSessionError)[keyof typeof AuthSessionError];

class AuthSessionService {
    constructor(
        private readonly authService: AuthService,
        private readonly userRepo: UserRepository,
        private readonly sessionRepo: SessionRepository,
        private readonly userPermissionRepo: UserPermissionRepository,
        private readonly auditLogRepo: AuditLogRepository,
        private readonly dataService: DataService
    ) {}

    async login(
        input: LoginInput,
        ctx: RequestContext
    ): Promise<Result<LoginResult, AuthSessionError>> {
        const {email, password} = input;

        const userResult = await this.userRepo.findByEmail(email);
        if (!userResult.ok) return failure(AuthSessionError.DB_ERROR);

        const user = userResult.data;
        if (!user || !user.passwordHash) return failure(AuthSessionError.INVALID_CREDENTIALS);
        if (!user.isActive) return failure(AuthSessionError.USER_INACTIVE);

        const passwordMatch = await this.authService.comparePassword(password, user.passwordHash);
        if (!passwordMatch.ok || !passwordMatch.data) {
            return failure(AuthSessionError.INVALID_CREDENTIALS);
        }

        const accessResult = this.authService.generateAccessToken({
            userId: user.id,
            tenantId: user.tenantId,
        });
        if (!accessResult.ok) return failure(AuthSessionError.DB_ERROR);

        const refreshToken = this.authService.generateOpaqueToken();

        const sessionResult = await this.sessionRepo.create({
            userId: user.id,
            refreshToken,
            userAgent: ctx.userAgent,
            ipAddress: ctx.ipAddress,
            expiresAt: this.authService.getRefreshTokenExpiry(),
        });
        if (!sessionResult.ok) return failure(AuthSessionError.DB_ERROR);

        await this.auditLogRepo.create({
            action: "login",
            entity: "user",
            entityId: user.id,
            tenantId: user.tenantId,
            userId: user.id,
            ipAddress: ctx.ipAddress,
        });

        return success({
            accessToken: accessResult.data,
            refreshToken,
        });
    }

    async logout(refreshToken: string | undefined, ctx: RequestContext): Promise<void> {
        if (!refreshToken) return;

        const sessionResult = await this.sessionRepo.findByRefreshToken(refreshToken);
        if (sessionResult.ok && sessionResult.data) {
            await this.sessionRepo.deleteById(sessionResult.data.id);

            await this.auditLogRepo.create({
                action: "logout",
                entity: "user",
                entityId: sessionResult.data.userId,
                tenantId: sessionResult.data.user.tenantId,
                userId: sessionResult.data.userId,
                ipAddress: ctx.ipAddress,
            });
        }
    }

    async refresh(
        refreshToken: string | undefined,
        ctx: RequestContext
    ): Promise<Result<LoginResult, AuthSessionError>> {
        if (!refreshToken) return failure(AuthSessionError.NO_REFRESH_TOKEN);

        const sessionResult = await this.sessionRepo.findByRefreshToken(refreshToken);
        if (!sessionResult.ok) return failure(AuthSessionError.DB_ERROR);

        const session = sessionResult.data;
        if (!session) return failure(AuthSessionError.SESSION_EXPIRED);

        if (session.expiresAt < new Date()) {
            return failure(AuthSessionError.SESSION_EXPIRED);
        }

        const user = session.user;
        if (!user.isActive) return failure(AuthSessionError.USER_INACTIVE);

        await this.sessionRepo.deleteById(session.id);

        const accessResult = this.authService.generateAccessToken({
            userId: user.id,
            tenantId: user.tenantId,
        });
        if (!accessResult.ok) return failure(AuthSessionError.DB_ERROR);

        const newRefreshToken = this.authService.generateOpaqueToken();

        const newSessionResult = await this.sessionRepo.create({
            userId: user.id,
            refreshToken: newRefreshToken,
            userAgent: ctx.userAgent,
            ipAddress: ctx.ipAddress,
            expiresAt: this.authService.getRefreshTokenExpiry(),
        });
        if (!newSessionResult.ok) return failure(AuthSessionError.DB_ERROR);

        return success({
            accessToken: accessResult.data,
            refreshToken: newRefreshToken,
            userId: user.id,
            tenantId: user.tenantId,
        });
    }

    async getMe(userId: string): Promise<Result<MeResult, AuthSessionError>> {
        const userResult = await this.userRepo.findById(userId);
        if (!userResult.ok) return failure(AuthSessionError.DB_ERROR);
        if (!userResult.data) return failure(AuthSessionError.USER_NOT_FOUND);

        const permissionsResult = await this.userPermissionRepo.getPermissionsForUser(userId);
        if (!permissionsResult.ok) return failure(AuthSessionError.DB_ERROR);

        const user = userResult.data;
        return success({
            id: user.id,
            email: user.email,
            name: user.name,
            tenantId: user.tenantId,
            isSuperAdmin: user.isSuperAdmin,
            permissions: permissionsResult.data,
        });
    }

    async setPassword(
        input: SetPasswordInput,
        ipAddress: string | undefined
    ): Promise<EmptyResult<AuthSessionError>> {
        const {token, password} = input;

        const userResult = await this.userRepo.findByInviteToken(token);
        if (!userResult.ok) return failure(AuthSessionError.DB_ERROR);

        const user = userResult.data;
        if (!user) return failure(AuthSessionError.TOKEN_NOT_FOUND);

        if (user.inviteTokenExpiry && user.inviteTokenExpiry < new Date()) {
            return failure(AuthSessionError.TOKEN_EXPIRED);
        }

        const hashResult = await this.authService.hashPassword(password);
        if (!hashResult.ok) return failure(AuthSessionError.DB_ERROR);

        // Atomic: update password + clear invite token
        try {
            await this.dataService.p.$transaction([
                this.dataService.p.user.update({
                    where: {id: user.id},
                    data: {passwordHash: hashResult.data},
                }),
                this.dataService.p.user.update({
                    where: {id: user.id},
                    data: {inviteToken: null, inviteTokenExpiry: null},
                }),
            ]);
        } catch {
            return failure(AuthSessionError.DB_ERROR);
        }

        await this.auditLogRepo.create({
            action: "set_password",
            entity: "user",
            entityId: user.id,
            tenantId: user.tenantId,
            userId: user.id,
            ipAddress,
        });

        return emptySuccess();
    }
}

export default AuthSessionService;
