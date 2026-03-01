import {Router} from "express";
import {PERMISSIONS} from "@kamers/shared";
import type {CreateRequirePermission} from "../middleware/require-permission";
import type AuditLogController from "../controllers/audit-log-controller";

export function makeAuditLogRouter(
    controller: AuditLogController,
    requirePermission: CreateRequirePermission
) {
    const router = Router();

    router.get("/", requirePermission(PERMISSIONS.AUDIT_READ), controller.list);

    return router;
}
