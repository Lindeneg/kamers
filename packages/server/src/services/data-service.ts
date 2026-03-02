import {PrismaBetterSqlite3} from "@prisma/adapter-better-sqlite3";
import {failure, success, type Result} from "@kamers/shared";
import {PrismaClient, Prisma} from "../generated/prisma";
import type EnvService from "./env-service";

const globalForPrisma = globalThis as unknown as {prisma?: PrismaClient};

const levels: Record<"test" | "development" | "production", Prisma.LogLevel[]> = {
    test: [],
    development: ["query", "warn", "error"],
    production: ["warn", "error"],
};

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
                log: levels[env.nodeEnv],
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
