import {
    success,
    emptySuccess,
    failure,
    type Result,
    type EmptyResult,
    type TenantsResponse,
    type PaginationParams,
} from "@kamers/shared";
import {paginate, toSkipTake} from "../lib/pagination";
import type TenantRepository from "../repositories/tenant-repository";
import type UserRepository from "../repositories/user-repository";
import type AuthService from "./auth-service";
import type AuditLogRepository from "../repositories/audit-log-repository";
import type DataService from "./data-service";
import type EmailService from "./email-service";

interface CreateTenantInput {
    name: string;
    domains: string[];
    adminEmail: string;
    adminName: string;
}

interface CreateTenantContext {
    actingUserId: string;
    ipAddress: string | undefined;
}

export const TenantError = {
    FORBIDDEN: "forbidden",
    TENANT_NOT_FOUND: "tenant_not_found",
    DB_ERROR: "db_error",
} as const;

export type TenantError = (typeof TenantError)[keyof typeof TenantError];

class TenantService {
    constructor(
        private readonly tenantRepo: TenantRepository,
        private readonly userRepo: UserRepository,
        private readonly authService: AuthService,
        private readonly auditLogRepo: AuditLogRepository,
        private readonly dataService: DataService,
        private readonly emailService: EmailService
    ) {}

    async create(
        input: CreateTenantInput,
        ctx: CreateTenantContext
    ): Promise<Result<TenantsResponse["create"], TenantError>> {
        // Verify super admin
        const userResult = await this.userRepo.findById(ctx.actingUserId);
        if (!userResult.ok) return failure(TenantError.DB_ERROR);
        if (!userResult.data?.isSuperAdmin) {
            return failure(TenantError.FORBIDDEN);
        }

        const {name, domains, adminEmail, adminName} = input;

        const inviteToken = this.authService.generateOpaqueToken();
        const inviteTokenExpiry = this.authService.getInviteTokenExpiry();

        // Atomic: create tenant + admin user
        try {
            const result = await this.dataService.p.$transaction(async (tx) => {
                const tenant = await tx.tenant.create({
                    data: {
                        name,
                        domains: {
                            create: domains.map((domain) => ({domain})),
                        },
                    },
                    include: {domains: true},
                });

                const adminUser = await tx.user.create({
                    data: {
                        email: adminEmail,
                        name: adminName,
                        tenantId: tenant.id,
                        isTenantAdmin: true,
                        inviteToken,
                        inviteTokenExpiry,
                    },
                });

                // grant tenant admin user all permissions for that tenant
                const allPerms = await tx.permission.findMany();
                for (const perm of allPerms) {
                    await tx.userPermission.upsert({
                        where: {userId_permissionId: {userId: adminUser.id, permissionId: perm.id}},
                        update: {},
                        create: {userId: adminUser.id, permissionId: perm.id},
                    });
                }

                return {tenant, adminUser};
            });

            await this.auditLogRepo.create({
                action: "create_tenant",
                entity: "tenant",
                entityId: result.tenant.id,
                details: JSON.stringify({name, domains, adminEmail}),
                tenantId: result.tenant.id,
                userId: ctx.actingUserId,
                ipAddress: ctx.ipAddress,
            });

            this.emailService.sendInviteEmail(adminEmail, adminName, inviteToken);

            return success({
                tenant: {
                    id: result.tenant.id,
                    name: result.tenant.name,
                    createdAt: result.tenant.createdAt,
                    updatedAt: result.tenant.updatedAt,
                    domains: result.tenant.domains.map((d) => ({
                        id: d.id,
                        domain: d.domain,
                        tenantId: d.tenantId,
                    })),
                },
                adminUser: {
                    id: result.adminUser.id,
                    email: result.adminUser.email,
                },
            });
        } catch {
            return failure(TenantError.DB_ERROR);
        }
    }

    async list(
        actingUserId: string,
        pagination: PaginationParams
    ): Promise<Result<TenantsResponse["list"], TenantError>> {
        // Verify super admin
        const userResult = await this.userRepo.findById(actingUserId);
        if (!userResult.ok) return failure(TenantError.DB_ERROR);
        if (!userResult.data?.isSuperAdmin) {
            return failure(TenantError.FORBIDDEN);
        }

        const tenantsResult = await this.tenantRepo.findAll(toSkipTake(pagination));
        if (!tenantsResult.ok) return failure(TenantError.DB_ERROR);

        const mapped = tenantsResult.data.data.map((t) => ({
            id: t.id,
            name: t.name,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            domains: t.domains.map((d) => ({
                id: d.id,
                domain: d.domain,
                tenantId: d.tenantId,
            })),
        }));

        return success(paginate(mapped, tenantsResult.data.total, pagination));
    }

    async softDelete(
        tenantId: string,
        ctx: {actingUserId: string; ipAddress: string | undefined}
    ): Promise<EmptyResult<TenantError>> {
        const userResult = await this.userRepo.findById(ctx.actingUserId);
        if (!userResult.ok) return failure(TenantError.DB_ERROR);
        if (!userResult.data?.isSuperAdmin) return failure(TenantError.FORBIDDEN);

        const tenantResult = await this.tenantRepo.findById(tenantId);
        if (!tenantResult.ok) return failure(TenantError.DB_ERROR);
        if (!tenantResult.data) return failure(TenantError.TENANT_NOT_FOUND);

        try {
            await this.dataService.p.$transaction(async (tx) => {
                await tx.tenant.update({
                    where: {id: tenantId},
                    data: {deletedAt: new Date()},
                });

                await tx.user.updateMany({
                    where: {tenantId},
                    data: {isActive: false, deletedAt: new Date()},
                });

                await tx.session.deleteMany({
                    where: {user: {tenantId}},
                });
            });
        } catch {
            return failure(TenantError.DB_ERROR);
        }

        await this.auditLogRepo.create({
            action: "delete_tenant",
            entity: "tenant",
            entityId: tenantId,
            tenantId,
            userId: ctx.actingUserId,
            ipAddress: ctx.ipAddress,
        });

        return emptySuccess();
    }
}

export default TenantService;
