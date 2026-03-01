import {PrismaBetterSqlite3} from "@prisma/adapter-better-sqlite3";
import {failure, success, type Result} from "@kamers/shared";
import {PrismaClient} from "../generated/prisma/index.js";
import type EnvService from "./env-service.js";

const globalForPrisma = globalThis as unknown as {prisma?: PrismaClient};

class DataService {
    #prisma: PrismaClient;

    constructor(env: EnvService) {
        if (globalForPrisma.prisma) {
            this.#prisma = globalForPrisma.prisma;
        } else {
            const adapter = new PrismaBetterSqlite3({
                url: env.databaseUrl,
            });
            this.#prisma = new PrismaClient({
                adapter,
                log: env.dev ? ["query", "warn", "error"] : ["warn", "error"],
            });
            if (!env.prod) {
                globalForPrisma.prisma = this.#prisma;
            }
        }
    }

    get p() {
        return this.#prisma;
    }

    async checkHealth(): Promise<Result<number>> {
        try {
            await this.p.$queryRaw`SELECT 1`;
            return success(0);
        } catch (err) {
            console.error("database health check failed", err);
            return failure("database health check failed");
        }
    }

    async teardown(): Promise<void> {
        await this.#prisma.$disconnect();
    }
}

export default DataService;
