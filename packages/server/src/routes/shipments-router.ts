import {Router} from "express";
import {PERMISSIONS} from "@kamers/shared";
import type {CreateRequirePermission} from "../middleware/require-permission.js";
import type ShipmentsController from "../controllers/shipments-controller.js";

export function makeShipmentsRouter(
    controller: ShipmentsController,
    requirePermission: CreateRequirePermission
) {
    const router = Router();

    // authenticated

    router.get("/", requirePermission(PERMISSIONS.SHIPMENTS_READ), controller.list);

    router.post("/", requirePermission(PERMISSIONS.SHIPMENTS_WRITE), controller.create);

    return router;
}
