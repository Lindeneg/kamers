import {Router} from "express";
import type TenantController from "../controllers/tenant-controller";

export function makeTenantsRouter(controller: TenantController) {
    const router = Router();

    router.post("/", controller.create);
    router.get("/", controller.list);
    router.delete("/:id", controller.delete);

    return router;
}
