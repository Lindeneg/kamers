import {ref, type Ref} from "vue";

interface UseApiCallReturn<T> {
    data: Ref<T | null>;
    error: Ref<string | null>;
    loading: Ref<boolean>;
    execute: (...args: unknown[]) => Promise<void>;
}

export function useApiCall<T>(
    fn: (...args: any[]) => Promise<{data: T}>
): UseApiCallReturn<T> {
    const data = ref<T | null>(null) as Ref<T | null>;
    const error = ref<string | null>(null);
    const loading = ref(false);

    async function execute(...args: unknown[]): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            const res = await fn(...args);
            data.value = res.data;
        } catch (e: any) {
            error.value =
                e.response?.data?.msg ??
                "Something went wrong. Please try again later.";
        } finally {
            loading.value = false;
        }
    }

    return {data, error, loading, execute};
}
