import {defineConfig} from "vitest/config";

export default defineConfig({
    test: {
        name: "server",
        pool: "forks",
        fileParallelism: false,
        hookTimeout: 30_000,
        include: ["src/__tests__/**/*.test.ts"],
        env: {
            DOTENV_CONFIG_QUIET: "true",
        },
    },
});
