import {Router, RequestHandler} from "express";
import type AuthController from "../controllers/auth-controller";

export function makeAuthRouter(controller: AuthController, authenticate: RequestHandler) {
    const router = Router();

    // public
    router.post("/login", controller.login);
    router.post("/refresh", controller.refresh);
    router.post("/set-password", controller.setPassword);

    // authenticated
    router.post("/logout", authenticate, controller.logout);
    router.get("/me", authenticate, controller.me);

    return router;
}
