import {Router, type RequestHandler} from "express";
import type AuthController from "../controllers/auth-controller";
import type TenantController from "../controllers/tenant-controller";
import type UsersController from "../controllers/users-controller";
import type ShipmentsController from "../controllers/shipments-controller";
import type BookingsController from "../controllers/bookings-controller";
import type ContainersController from "../controllers/containers-controller";
import type AuditLogController from "../controllers/audit-log-controller";
import type DataService from "../services/data-service";
import type {CreateRequirePermission} from "../middleware/require-permission";
import {makeAuthRouter} from "./auth-router";
import {makeTenantsRouter} from "./tenants-router";
import {makeUsersRouter} from "./users-router";
import {makeShipmentsRouter} from "./shipments-router";
import {makeBookingsRouter} from "./bookings-router";
import {makeContainersRouter} from "./containers-router";
import {makeAuditLogRouter} from "./audit-log-router";
import {makeHealthRouter} from "./health-router";

export function makeAppRouter(
    authController: AuthController,
    tenantController: TenantController,
    usersController: UsersController,
    shipmentsController: ShipmentsController,
    bookingsController: BookingsController,
    containersController: ContainersController,
    auditLogController: AuditLogController,
    dataService: DataService,
    authenticate: RequestHandler,
    requirePermission: CreateRequirePermission
): Router {
    const router = Router();

    router.use("/health", makeHealthRouter(dataService));

    router.use("/auth", makeAuthRouter(authController, authenticate));

    router.use("/tenants", authenticate, makeTenantsRouter(tenantController));

    router.use("/users", authenticate, makeUsersRouter(usersController, requirePermission));
    router.use(
        "/shipments",
        authenticate,
        makeShipmentsRouter(shipmentsController, requirePermission)
    );
    router.use(
        "/bookings",
        authenticate,
        makeBookingsRouter(bookingsController, requirePermission)
    );
    router.use(
        "/containers",
        authenticate,
        makeContainersRouter(containersController, requirePermission)
    );
    router.use(
        "/audit-logs",
        authenticate,
        makeAuditLogRouter(auditLogController, requirePermission)
    );

    return router;
}
