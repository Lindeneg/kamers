import {loadEnv, unwrap} from "@kamers/shared";
import EnvService from "./services/env-service";
import LoggerService from "./services/logger-service";
import DataService from "./services/data-service";
import ExpressService from "./services/express-service";
import AuthService from "./services/auth-service";
import AuthSessionService from "./services/auth-session-service";
import UserService from "./services/user-service";
import TenantService from "./services/tenant-service";
import ShipmentService from "./services/shipment-service";
import BookingService from "./services/booking-service";
import ContainerService from "./services/container-service";
import AuditLogService from "./services/audit-log-service";
import EmailService from "./services/email-service";
import TenantRepository from "./repositories/tenant-repository";
import UserRepository from "./repositories/user-repository";
import PermissionRepository from "./repositories/permission-repository";
import SessionRepository from "./repositories/session-repository";
import AuditLogRepository from "./repositories/audit-log-repository";
import UserPermissionRepository from "./repositories/user-permission-repository";
import ShipmentRepository from "./repositories/shipment-repository";
import BookingRepository from "./repositories/booking-repository";
import ContainerRepository from "./repositories/container-repository";
import AuthController from "./controllers/auth-controller";
import TenantController from "./controllers/tenant-controller";
import UsersController from "./controllers/users-controller";
import ShipmentsController from "./controllers/shipments-controller";
import BookingsController from "./controllers/bookings-controller";
import ContainersController from "./controllers/containers-controller";
import AuditLogController from "./controllers/audit-log-controller";
import {createAuthenticate} from "./middleware/authenticate";
import {createRequirePermission} from "./middleware/require-permission";
import {globalErrorHandler} from "./lib/error-handler";
import {makeAppRouter} from "./routes";

async function main(args: string[] | undefined) {
    unwrap(loadEnv("server", args));

    const env = unwrap(EnvService.make(process.env));

    const log = new LoggerService(env);

    const dataService = new DataService(env);

    const tenantRepo = new TenantRepository(dataService, log);
    const userRepo = new UserRepository(dataService, log);
    const permissionRepo = new PermissionRepository(dataService, log);
    const sessionRepo = new SessionRepository(dataService, log);
    const auditLogRepo = new AuditLogRepository(dataService, log);
    const userPermissionRepo = new UserPermissionRepository(dataService, log);
    const shipmentRepo = new ShipmentRepository(dataService, log);
    const bookingRepo = new BookingRepository(dataService, log);
    const containerRepo = new ContainerRepository(dataService, log);

    const authService = new AuthService(
        env,
        {
            saltRounds: 12,
            accessTokenExpiryMs: 15 * 60 * 1000, // 15 minutes
            refreshTokenExpiryMs: 7 * 24 * 60 * 60 * 1000, // 7 days
            inviteTokenExpiryMs: 7 * 24 * 60 * 60 * 1000, // 7 days
        },
        log
    );

    const emailService = new EmailService(log, env.clientUrl);

    const authSessionService = new AuthSessionService(
        authService,
        userRepo,
        sessionRepo,
        userPermissionRepo,
        auditLogRepo,
        dataService
    );
    const userService = new UserService(
        authService,
        userRepo,
        userPermissionRepo,
        auditLogRepo,
        dataService,
        emailService
    );
    const tenantService = new TenantService(
        tenantRepo,
        userRepo,
        authService,
        auditLogRepo,
        dataService,
        emailService
    );

    const shipmentService = new ShipmentService(shipmentRepo, auditLogRepo);
    const bookingService = new BookingService(bookingRepo, shipmentRepo, auditLogRepo);
    const containerService = new ContainerService(containerRepo, shipmentRepo, auditLogRepo);
    const auditLogService = new AuditLogService(auditLogRepo, userRepo);

    const authController = new AuthController(authService, authSessionService);
    const tenantController = new TenantController(tenantService);
    const usersController = new UsersController(userService);
    const shipmentsController = new ShipmentsController(shipmentService);
    const bookingsController = new BookingsController(bookingService);
    const containersController = new ContainersController(containerService);
    const auditLogController = new AuditLogController(auditLogService);

    const authenticateMiddleware = createAuthenticate(authService, userRepo);
    const requirePermissionMiddleware = createRequirePermission(userPermissionRepo);

    const router = makeAppRouter(
        authController,
        tenantController,
        usersController,
        shipmentsController,
        bookingsController,
        containersController,
        auditLogController,
        dataService,
        authenticateMiddleware,
        requirePermissionMiddleware
    );

    const expressService = new ExpressService(env, log, globalErrorHandler, router);

    const startResult = expressService.start();
    if (!startResult.ok) {
        log.error(startResult.ctx);
        process.exit(1);
    }

    // ── Graceful shutdown ────────────────────────────────────────
    const shutdown = async (signal: string) => {
        log.info(`received ${signal}, shutting down...`);
        await dataService.teardown();
        process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

main(process.argv.slice(2));
