import type {AuditLogsResponse, PaginationParams} from "@kamers/shared";
import api from "./client";
import {wrap} from "./wrap";

export function listAuditLogs(params?: Partial<PaginationParams> & {tenantId?: string}) {
    return wrap(api.get<AuditLogsResponse["list"]>("/audit-logs", {params}));
}
