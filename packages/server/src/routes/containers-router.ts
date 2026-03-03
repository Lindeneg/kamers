import {Router} from "express";
import {PERMISSIONS} from "@kamers/shared";
import type {CreateRequirePermission} from "../middleware/require-permission";
import type ContainersController from "../controllers/containers-controller";

export function makeContainersRouter(
    controller: ContainersController,
    requirePermission: CreateRequirePermission
) {
    const router = Router();

    router.get("/", requirePermission(PERMISSIONS.CONTAINERS_READ), controller.list);

    router.post("/", requirePermission(PERMISSIONS.CONTAINERS_WRITE), controller.create);

    router.put("/:id", requirePermission(PERMISSIONS.CONTAINERS_WRITE), controller.update);

    router.delete("/:id", requirePermission(PERMISSIONS.CONTAINERS_WRITE), controller.delete);

    return router;
}
