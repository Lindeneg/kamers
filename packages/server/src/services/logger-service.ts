import pino, {type LogFn, type Logger} from "pino";
import {pinoHttp} from "pino-http";
import type {Request} from "express";
import type EnvService from "./env-service.js";

class LoggerService {
    readonly #logger: Logger;

    constructor(env: EnvService) {
        this.#logger = pino({
            // TODO get from environment
            level: env.test ? "silent" : env.prod ? "info" : "debug",
            transport: {
                target: "pino-pretty",
                options: {
                    colorize: true,
                    translateTime: "HH:MM:ss",
                    ignore: "pid,hostname,req,res,reqId,responseTime,userId",
                },
            },
        });
    }

    // just so i can do logService.trace instead of logService.logger.trace
    trace(...args: Parameters<LogFn>) {
        this.#logger.trace(...args);
    }
    debug(...args: Parameters<LogFn>) {
        this.#logger.debug(...args);
    }
    info(...args: Parameters<LogFn>) {
        this.#logger.info(...args);
    }
    warn(...args: Parameters<LogFn>) {
        this.#logger.warn(...args);
    }
    error(...args: Parameters<LogFn>) {
        this.#logger.error(...args);
    }
    fatal(...args: Parameters<LogFn>) {
        this.#logger.fatal(...args);
    }

    makeRequestLogger() {
        return pinoHttp({
            logger: this.#logger,
            quietReqLogger: true,
            customSuccessMessage: (req, res, responseTime) => {
                const r = req as Request;
                const user = r.auth?.userId ? ` user=${r.auth.userId}` : "";
                const tenant = r.auth?.tenantId ? ` tenant=${r.auth.tenantId}` : "";
                return `${req.id} ${req.method} ${req.url} ${res.statusCode}${user}${tenant} ${responseTime}ms`;
            },
            customErrorMessage: (req, res, err) => {
                const r = req as Request;
                const user = r.auth?.userId ? ` user=${r.auth.userId}` : "";
                const tenant = r.auth?.tenantId ? ` tenant=${r.auth.tenantId}` : "";
                return `${req.id} ${req.method} ${req.url} ${res.statusCode}${user}${tenant} ${err.message}`;
            },
        });
    }
}

export default LoggerService;
