import {Router} from "express";
import {PERMISSIONS} from "@kamers/shared";
import type {CreateRequirePermission} from "../middleware/require-permission";
import type BookingsController from "../controllers/bookings-controller";

export function makeBookingsRouter(
    controller: BookingsController,
    requirePermission: CreateRequirePermission
) {
    const router = Router();

    router.get("/", requirePermission(PERMISSIONS.BOOKINGS_READ), controller.list);

    router.post("/", requirePermission(PERMISSIONS.BOOKINGS_WRITE), controller.create);

    router.put("/:id", requirePermission(PERMISSIONS.BOOKINGS_WRITE), controller.update);

    router.delete("/:id", requirePermission(PERMISSIONS.BOOKINGS_WRITE), controller.delete);

    return router;
}
