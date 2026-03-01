import {ref, type Ref} from "vue";
import type {Result} from "@kamers/shared";

interface UseApiCallReturn<T> {
    data: Ref<T | null>;
    error: Ref<string | null>;
    loading: Ref<boolean>;
    execute: (...args: unknown[]) => Promise<void>;
}

export function useApiCall<T>(
    fn: (...args: any[]) => Promise<Result<T>>
): UseApiCallReturn<T> {
    const data = ref<T | null>(null) as Ref<T | null>;
    const error = ref<string | null>(null);
    const loading = ref(false);

    async function execute(...args: unknown[]): Promise<void> {
        loading.value = true;
        error.value = null;
        const result = await fn(...args);
        if (result.ok) {
            data.value = result.data;
        } else {
            error.value = result.ctx;
        }
        loading.value = false;
    }

    return {data, error, loading, execute};
}
