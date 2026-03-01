import {ref, computed} from "vue";
import api from "../api/client";

const activeRequests = ref(0);

api.interceptors.request.use(
    (config) => {
        activeRequests.value++;
        return config;
    },
    (error) => {
        activeRequests.value--;
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        activeRequests.value--;
        return response;
    },
    (error) => {
        activeRequests.value--;
        return Promise.reject(error);
    }
);

export function useLoadingTracker() {
    const isLoading = computed(() => activeRequests.value > 0);
    return {isLoading};
}
