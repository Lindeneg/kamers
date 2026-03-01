import {defineConfig} from "vite";
import vue from "@vitejs/plugin-vue";
import {unwrap, loadEnv} from "@kamers/shared";

unwrap(loadEnv("client", process.argv.slice(2)));

if (!process.env.API_URL) throw new Error("API_URL missing in client environment");

export default defineConfig(() => {
    return {
        plugins: [vue()],
        server: {
            proxy: {
                "/api": process.env.API_URL!,
            },
        },
    };
});
