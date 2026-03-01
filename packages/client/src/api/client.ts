import axios from "axios";
import router from "../router";

const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
});

const AUTH_ENDPOINTS = ["/auth/login", "/auth/refresh", "/auth/set-password"];

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const path = originalRequest.url?.replace(/^\/api/, "") ?? "";

        // Don't intercept 401s from auth endpoints — those are expected responses
        if (AUTH_ENDPOINTS.some((ep) => path.startsWith(ep))) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                await axios.post("/api/auth/refresh", null, {
                    withCredentials: true,
                });
                return api(originalRequest);
            } catch {
                router.push("/login");
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
