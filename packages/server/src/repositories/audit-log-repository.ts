import {success, failure, type Result, type RawModel} from "@kamers/shared";
import type {AuditLog, User} from "../generated/prisma";
import type {SkipTake} from "../lib/pagination";
import type DataService from "../services/data-service";
import type LoggerService from "../services/logger-service";

export type AuditLogWithUser = AuditLog & {user: Pick<User, "id" | "email" | "name"> | null};

class AuditLogRepository {
    constructor(
        private readonly db: DataService,
        private readonly log: LoggerService
    ) {}

    async create(data: RawModel<AuditLog>): Promise<Result<AuditLog>> {
        try {
            const log = await this.db.p.auditLog.create({data});
            return success(log);
        } catch (err) {
            this.log.error(err, "failed to create audit log");
            return failure("failed to create audit log");
        }
    }

    async findByTenantId(
        tenantId: string,
        opts: Partial<SkipTake> = {}
    ): Promise<Result<{data: AuditLogWithUser[]; total: number}>> {
        try {
            const {skip = 0, take = 50} = opts;
            const [data, total] = await Promise.all([
                this.db.p.auditLog.findMany({
                    where: {tenantId},
                    orderBy: {createdAt: "desc"},
                    skip,
                    take,
                    include: {
                        user: {select: {id: true, email: true, name: true}},
                    },
                }),
                this.db.p.auditLog.count({where: {tenantId}}),
            ]);
            return success({data, total});
        } catch (err) {
            this.log.error(err, "failed to find audit logs");
            return failure("failed to find audit logs");
        }
    }
}

export default AuditLogRepository;
