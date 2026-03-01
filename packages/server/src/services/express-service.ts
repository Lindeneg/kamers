import type {Server} from "node:http";
import express, {type Request, type Response, type NextFunction, type Router} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {failure, emptySuccess, type EmptyResult} from "@kamers/shared";
import type EnvService from "./env-service.js";
import type LoggerService from "./logger-service.js";
import type {GlobalErrorHandler} from "../lib/error-handler.js";

class ExpressService {
    #server: Server | null = null;
    readonly app;

    constructor(
        private readonly env: EnvService,
        private readonly log: LoggerService,
        errorHandler: GlobalErrorHandler,
        router: Router
    ) {
        this.app = express();

        this.app.use(
            cors({
                origin: env.clientUrl,
                credentials: true,
            })
        );
        this.app.use(express.json());
        this.app.use(cookieParser());
        this.app.use(this.log.makeRequestLogger());

        this.app.use("/api", router);

        this.app.use((err: any, request: Request, response: Response, next: NextFunction) =>
            errorHandler(err, request, response, next)
        );
    }

    start(): EmptyResult {
        try {
            this.#server = this.app.listen(this.env.port, () => {
                this.log.info(`server listening on http://localhost:${this.env.port}`);
            });
            return emptySuccess();
        } catch (err) {
            this.log.error(err, "failed to start server");
            return failure(err instanceof Error ? err.message : "failed to start server");
        }
    }

    async teardown(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.#server) return resolve();
            this.#server.close(() => resolve());
        });
    }
}

export default ExpressService;
