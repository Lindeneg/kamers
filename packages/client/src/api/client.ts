import axios from "axios";
import router from "../router";

const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

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
