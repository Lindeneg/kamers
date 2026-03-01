import type {Logger as PinoLogger} from "pino";

declare global {
    namespace Express {
        interface Request {
            log: PinoLogger;
            auth?: {
                userId: string;
                tenantId: string;
            };
        }
    }
}
