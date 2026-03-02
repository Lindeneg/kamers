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
import {resolveTenantId} from "../lib/cross-tenant";
import type AuthService from "./auth-service";
import type UserRepository from "../repositories/user-repository";
import type UserPermissionRepository from "../repositories/user-permission-repository";
import type AuditLogRepository from "../repositories/audit-log-repository";
import type DataService from "./data-service";
import type EmailService from "./email-service";

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

interface TransferOwnershipContext {
    tenantId: string;
    actingUserId: string;
    ipAddress: string | undefined;
}

export const UserError = {
    EMAIL_TAKEN: "email_taken",
    USER_NOT_FOUND: "user_not_found",
    CROSS_TENANT: "cross_tenant",
    CANNOT_MODIFY_TENANT_ADMIN: "cannot_modify_tenant_admin",
    CANNOT_DELETE_ADMIN: "cannot_delete_admin",
    CANNOT_MODIFY_SELF: "cannot_modify_self",
    NOT_TENANT_ADMIN: "not_tenant_admin",
    DB_ERROR: "db_error",
} as const;

export type UserError = (typeof UserError)[keyof typeof UserError];

class UserService {
    constructor(
        private readonly authService: AuthService,
        private readonly userRepo: UserRepository,
        private readonly userPermissionRepo: UserPermissionRepository,
        private readonly auditLogRepo: AuditLogRepository,
        private readonly dataService: DataService,
        private readonly emailService: EmailService
    ) {}

    async listByTenant(
        tenantId: string,
        queryTenantId: string | undefined,
        actingUserId: string,
        pagination: PaginationParams
    ): Promise<Result<UsersResponse["list"], UserError>> {
        const resolved = await resolveTenantId(this.userRepo, actingUserId, tenantId, queryTenantId, {
            dbError: UserError.DB_ERROR,
            forbidden: UserError.CROSS_TENANT,
        });
        if (!resolved.ok) return failure(resolved.ctx);

        const usersResult = await this.userRepo.findByTenantId(resolved.data, toSkipTake(pagination));
        if (!usersResult.ok) return failure(UserError.DB_ERROR);

        const mapped = usersResult.data.data.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            isActive: u.isActive,
            isDeleted: u.deletedAt !== null,
            isSuperAdmin: u.isSuperAdmin,
            isTenantAdmin: u.isTenantAdmin,
            tenantId: u.tenantId,
            hasPendingInvite: u.inviteToken !== null,
            permissions: u.userPermissions.map((up) => up.permission.slug) as Permission[],
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
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
                details: JSON.stringify({email, name}),
                tenantId: ctx.tenantId,
                userId: ctx.userId,
                ipAddress: ctx.ipAddress,
            });

            this.emailService.sendInviteEmail(email, name, inviteToken);

            return success({
                id: user.id,
                email: user.email,
            });
        } catch {
            return failure(UserError.DB_ERROR);
        }
    }

    async updatePermissions(
        input: UpdatePermissionsInput,
        ctx: UpdatePermissionsContext
    ): Promise<EmptyResult<UserError>> {
        if (input.userId === ctx.actingUserId) {
            return failure(UserError.CANNOT_MODIFY_SELF);
        }

        const userResult = await this.userRepo.findById(input.userId);
        if (!userResult.ok) return failure(UserError.DB_ERROR);
        if (!userResult.data) return failure(UserError.USER_NOT_FOUND);
        if (userResult.data.tenantId !== ctx.tenantId) {
            return failure(UserError.CROSS_TENANT);
        }
        if (userResult.data.isTenantAdmin) {
            return failure(UserError.CANNOT_MODIFY_TENANT_ADMIN);
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
            details: JSON.stringify({
                targetEmail: userResult.data.email,
                targetName: userResult.data.name,
                permissions: input.permissions,
            }),
            tenantId: ctx.tenantId,
            userId: ctx.actingUserId,
            ipAddress: ctx.ipAddress,
        });

        return emptySuccess();
    }

    async transferOwnership(
        targetUserId: string,
        ctx: TransferOwnershipContext
    ): Promise<EmptyResult<UserError>> {
        // Verify acting user IS the tenant admin
        const actingResult = await this.userRepo.findById(ctx.actingUserId);
        if (!actingResult.ok) return failure(UserError.DB_ERROR);
        if (!actingResult.data) return failure(UserError.USER_NOT_FOUND);
        if (!actingResult.data.isTenantAdmin) return failure(UserError.NOT_TENANT_ADMIN);

        // Verify target user exists and is in the same tenant
        const targetResult = await this.userRepo.findById(targetUserId);
        if (!targetResult.ok) return failure(UserError.DB_ERROR);
        if (!targetResult.data) return failure(UserError.USER_NOT_FOUND);
        if (targetResult.data.tenantId !== ctx.tenantId) return failure(UserError.CROSS_TENANT);

        try {
            await this.dataService.p.$transaction(async (tx) => {
                await tx.user.update({
                    where: {id: ctx.actingUserId},
                    data: {isTenantAdmin: false},
                });
                await tx.user.update({
                    where: {id: targetUserId},
                    data: {isTenantAdmin: true},
                });

                const allPerms = await tx.permission.findMany();
                for (const perm of allPerms) {
                    await tx.userPermission.upsert({
                        where: {userId_permissionId: {userId: targetUserId, permissionId: perm.id}},
                        update: {},
                        create: {userId: targetUserId, permissionId: perm.id},
                    });
                }
            });
        } catch {
            return failure(UserError.DB_ERROR);
        }

        await this.auditLogRepo.create({
            action: "transfer_ownership",
            entity: "user",
            entityId: targetUserId,
            details: JSON.stringify({
                fromEmail: actingResult.data.email,
                fromName: actingResult.data.name,
                toEmail: targetResult.data.email,
                toName: targetResult.data.name,
            }),
            tenantId: ctx.tenantId,
            userId: ctx.actingUserId,
            ipAddress: ctx.ipAddress,
        });

        return emptySuccess();
    }

    async toggleActive(
        targetUserId: string,
        isActive: boolean,
        ctx: UpdatePermissionsContext
    ): Promise<EmptyResult<UserError>> {
        if (targetUserId === ctx.actingUserId) {
            return failure(UserError.CANNOT_MODIFY_SELF);
        }

        const userResult = await this.userRepo.findById(targetUserId);
        if (!userResult.ok) return failure(UserError.DB_ERROR);
        if (!userResult.data) return failure(UserError.USER_NOT_FOUND);
        if (userResult.data.tenantId !== ctx.tenantId) return failure(UserError.CROSS_TENANT);
        if (userResult.data.isTenantAdmin) return failure(UserError.CANNOT_MODIFY_TENANT_ADMIN);

        try {
            if (isActive) {
                await this.dataService.p.user.update({
                    where: {id: targetUserId},
                    data: {isActive},
                });
            } else {
                await this.dataService.p.$transaction(async (tx) => {
                    await tx.user.update({
                        where: {id: targetUserId},
                        data: {isActive},
                    });
                    await tx.session.deleteMany({where: {userId: targetUserId}});
                });
            }
        } catch {
            return failure(UserError.DB_ERROR);
        }

        await this.auditLogRepo.create({
            action: isActive ? "activate_user" : "deactivate_user",
            entity: "user",
            entityId: targetUserId,
            details: JSON.stringify({email: userResult.data.email, name: userResult.data.name}),
            tenantId: ctx.tenantId,
            userId: ctx.actingUserId,
            ipAddress: ctx.ipAddress,
        });

        return emptySuccess();
    }

    async softDelete(
        targetUserId: string,
        ctx: UpdatePermissionsContext
    ): Promise<EmptyResult<UserError>> {
        if (targetUserId === ctx.actingUserId) {
            return failure(UserError.CANNOT_MODIFY_SELF);
        }

        const userResult = await this.userRepo.findById(targetUserId);
        if (!userResult.ok) return failure(UserError.DB_ERROR);
        if (!userResult.data) return failure(UserError.USER_NOT_FOUND);
        if (userResult.data.tenantId !== ctx.tenantId) return failure(UserError.CROSS_TENANT);
        if (userResult.data.isTenantAdmin) return failure(UserError.CANNOT_DELETE_ADMIN);

        try {
            await this.dataService.p.$transaction(async (tx) => {
                await tx.user.update({
                    where: {id: targetUserId},
                    data: {
                        deletedAt: new Date(),
                        isActive: false,
                        email: `deleted_${targetUserId}_${userResult.data?.email}`,
                    },
                });
                await tx.session.deleteMany({where: {userId: targetUserId}});
            });
        } catch {
            return failure(UserError.DB_ERROR);
        }

        await this.auditLogRepo.create({
            action: "delete_user",
            entity: "user",
            entityId: targetUserId,
            details: JSON.stringify({email: userResult.data.email, name: userResult.data.name}),
            tenantId: ctx.tenantId,
            userId: ctx.actingUserId,
            ipAddress: ctx.ipAddress,
        });

        return emptySuccess();
    }
}

export default UserService;
