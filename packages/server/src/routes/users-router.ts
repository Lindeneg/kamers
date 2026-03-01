import {Router} from "express";
import {PERMISSIONS} from "@kamers/shared";
import type {CreateRequirePermission} from "../middleware/require-permission";
import type UsersController from "../controllers/users-controller";

export function makeUsersRouter(
    controller: UsersController,
    requirePermission: CreateRequirePermission
) {
    const router = Router();

    router.get("/", requirePermission(PERMISSIONS.USERS_READ), controller.list);

    router.post("/invite", requirePermission(PERMISSIONS.USERS_WRITE), controller.invite);

    router.put(
        "/:userId/permissions",
        requirePermission(PERMISSIONS.USERS_WRITE),
        controller.updatePermissions
    );

    return router;
}
