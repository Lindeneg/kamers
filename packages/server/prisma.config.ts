import {defineConfig} from "prisma/config";
import {unwrap, loadEnv} from "@kamers/shared";

unwrap(loadEnv("prisma", process.argv.slice(2)));

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing in prisma environment");

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: process.env["DATABASE_URL"]!,
    },
});
