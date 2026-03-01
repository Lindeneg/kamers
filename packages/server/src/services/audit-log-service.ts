import {success, failure, type Result, type AuditLogsResponse, type PaginationParams} from "@kamers/shared";
import {paginate, toSkipTake} from "../lib/pagination";
import {resolveTenantId} from "../lib/cross-tenant";
import type AuditLogRepository from "../repositories/audit-log-repository";
import type UserRepository from "../repositories/user-repository";

export const AuditLogError = {
    FORBIDDEN: "forbidden",
    DB_ERROR: "db_error",
} as const;

export type AuditLogError = (typeof AuditLogError)[keyof typeof AuditLogError];

class AuditLogService {
    constructor(
        private readonly auditLogRepo: AuditLogRepository,
        private readonly userRepo: UserRepository
    ) {}

    async listByTenant(
        tenantId: string,
        queryTenantId: string | undefined,
        actingUserId: string,
        pagination: PaginationParams
    ): Promise<Result<AuditLogsResponse["list"], AuditLogError>> {
        const resolved = await resolveTenantId(this.userRepo, actingUserId, tenantId, queryTenantId, {
            dbError: AuditLogError.DB_ERROR,
            forbidden: AuditLogError.FORBIDDEN,
        });
        if (!resolved.ok) return failure(resolved.ctx);

        const result = await this.auditLogRepo.findByTenantId(resolved.data, toSkipTake(pagination));
        if (!result.ok) return failure(AuditLogError.DB_ERROR);

        const mapped = result.data.data.map((log) => ({
            id: log.id,
            action: log.action,
            entity: log.entity,
            entityId: log.entityId,
            userId: log.userId,
            tenantId: log.tenantId,
            createdAt: log.createdAt,
            details: log.details,
            ipAddress: log.ipAddress,
            user: log.user,
        }));

        return success(paginate(mapped, result.data.total, pagination));
    }
}

export default AuditLogService;
