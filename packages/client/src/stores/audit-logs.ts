import {defineStore} from "pinia";
import type {AuditLogEntry} from "@kamers/shared";
import {listAuditLogs} from "../api/audit-logs";
import {usePaginatedStore} from "./paginated";

export const useAuditLogsStore = defineStore("audit-logs", () =>
    usePaginatedStore<AuditLogEntry, {tenantId?: string}>(listAuditLogs)
);
