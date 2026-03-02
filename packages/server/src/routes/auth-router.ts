import {Router, RequestHandler} from "express";
import type AuthController from "../controllers/auth-controller";

export function makeAuthRouter(controller: AuthController, authenticate: RequestHandler) {
    const router = Router();

    // public
    router.post("/login", controller.login);
    router.post("/refresh", controller.refresh);
    router.post("/set-password", controller.setPassword);
    router.get("/oauth/providers", controller.oauthProviders);
    router.get("/oauth/:provider", controller.oauthStart);
    router.get("/oauth/:provider/callback", controller.oauthCallback);

    // authenticated
    router.post("/logout", authenticate, controller.logout);
    router.get("/me", authenticate, controller.me);

    return router;
}
