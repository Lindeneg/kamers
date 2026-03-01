import type {AuditLogsResponse, PaginationParams} from "@kamers/shared";
import api from "./client";

export function listAuditLogs(params?: Partial<PaginationParams> & {tenantId?: string}) {
    return api.get<AuditLogsResponse["list"]>("/audit-logs", {params});
}
