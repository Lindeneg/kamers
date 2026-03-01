import {Router} from "express";
import type TenantController from "../controllers/tenant-controller.js";

export function makeTenantsRouter(controller: TenantController) {
    const router = Router();

    router.post("/", controller.create);
    router.get("/", controller.list);

    return router;
}
