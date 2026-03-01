import {defineConfig} from "prisma/config";
import {unwrap, loadEnv} from "@kamers/shared";

export default function createConfig(args: string[]) {
    unwrap(loadEnv("prisma", args));

    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing in prisma environment");

    return defineConfig({
        schema: "prisma/schema.prisma",
        migrations: {
            path: "prisma/migrations",
        },
        datasource: {
            url: process.env["DATABASE_URL"]!,
        },
    });
}
