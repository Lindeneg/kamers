import {
    success,
    emptySuccess,
    failure,
    type Result,
    type EmptyResult,
    type UsersResponse,
    type PaginationParams,
    type Permission,
} from "@kamers/shared";
import {paginate, toSkipTake} from "../lib/pagination";
import type AuthService from "./auth-service";
import type UserRepository from "../repositories/user-repository";
import type UserPermissionRepository from "../repositories/user-permission-repository";
import type AuditLogRepository from "../repositories/audit-log-repository";
import type DataService from "./data-service";

interface InviteInput {
    email: string;
    name: string;
}

interface InviteContext {
    tenantId: string;
    userId: string;
    ipAddress: string | undefined;
}

interface UpdatePermissionsInput {
    userId: string;
    permissions: string[];
}

interface UpdatePermissionsContext {
    tenantId: string;
    actingUserId: string;
    ipAddress: string | undefined;
}

export const UserError = {
    EMAIL_TAKEN: "email_taken",
    USER_NOT_FOUND: "user_not_found",
    CROSS_TENANT: "cross_tenant",
    DB_ERROR: "db_error",
} as const;

export type UserError = (typeof UserError)[keyof typeof UserError];

class UserService {
    constructor(
        private readonly authService: AuthService,
        private readonly userRepo: UserRepository,
        private readonly userPermissionRepo: UserPermissionRepository,
        private readonly auditLogRepo: AuditLogRepository,
        private readonly dataService: DataService
    ) {}

    async listByTenant(tenantId: string, pagination: PaginationParams): Promise<Result<UsersResponse["list"], UserError>> {
        const usersResult = await this.userRepo.findByTenantId(tenantId, toSkipTake(pagination));
        if (!usersResult.ok) return failure(UserError.DB_ERROR);

        const mapped = usersResult.data.data.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            isActive: u.isActive,
            isSuperAdmin: u.isSuperAdmin,
            tenantId: u.tenantId,
            hasPendingInvite: u.inviteToken !== null,
            permissions: u.userPermissions.map((up) => up.permission.slug) as Permission[],
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            ...(u.inviteToken && {inviteLink: `/set-password?token=${u.inviteToken}`}),
        }));

        return success(paginate(mapped, usersResult.data.total, pagination));
    }

    async invite(
        input: InviteInput,
        ctx: InviteContext
    ): Promise<Result<UsersResponse["invite"], UserError>> {
        const {email, name} = input;

        const existingResult = await this.userRepo.findByEmail(email);
        if (!existingResult.ok) return failure(UserError.DB_ERROR);
        if (existingResult.data) return failure(UserError.EMAIL_TAKEN);

        const inviteToken = this.authService.generateOpaqueToken();
        const inviteTokenExpiry = this.authService.getInviteTokenExpiry();

        try {
            const user = await this.dataService.p.user.create({
                data: {
                    email,
                    name,
                    tenantId: ctx.tenantId,
                    inviteToken,
                    inviteTokenExpiry,
                },
            });

            await this.auditLogRepo.create({
                action: "invite_user",
                entity: "user",
                entityId: user.id,
                details: JSON.stringify({email}),
                tenantId: ctx.tenantId,
                userId: ctx.userId,
                ipAddress: ctx.ipAddress,
            });

            return success({
                id: user.id,
                email: user.email,
                inviteToken,
            });
        } catch {
            return failure(UserError.DB_ERROR);
        }
    }

    async updatePermissions(
        input: UpdatePermissionsInput,
        ctx: UpdatePermissionsContext
    ): Promise<EmptyResult<UserError>> {
        const userResult = await this.userRepo.findById(input.userId);
        if (!userResult.ok) return failure(UserError.DB_ERROR);
        if (!userResult.data) return failure(UserError.USER_NOT_FOUND);
        if (userResult.data.tenantId !== ctx.tenantId) {
            return failure(UserError.CROSS_TENANT);
        }

        const setResult = await this.userPermissionRepo.setPermissions(
            input.userId,
            input.permissions
        );
        if (!setResult.ok) return failure(UserError.DB_ERROR);

        await this.auditLogRepo.create({
            action: "update_user_permissions",
            entity: "user",
            entityId: input.userId,
            details: JSON.stringify({permissions: input.permissions}),
            tenantId: ctx.tenantId,
            userId: ctx.actingUserId,
            ipAddress: ctx.ipAddress,
        });

        return emptySuccess();
    }
}

export default UserService;
