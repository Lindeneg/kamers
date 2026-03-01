import {ref} from "vue";
import type {Paginated, PaginationParams, Result} from "@kamers/shared";

type FetchFn<T, TFilter = {}> = (params: PaginationParams & TFilter) => Promise<Result<Paginated<T>>>;

export function usePaginatedStore<T, TFilter = {}>(apiFn: FetchFn<T, TFilter>) {
    const items = ref<Paginated<T> | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    let cache = new Map<number, T[]>();
    let cachedPageSize = 0;
    let cachedTotal = 0;
    let cachedTotalPages = 0;

    async function fetch(params: Partial<PaginationParams> & TFilter) {
        const page = (params as any).page ?? 1;
        const pageSize = (params as any).pageSize ?? 10;

        if (pageSize !== cachedPageSize) {
            cache.clear();
            cachedPageSize = pageSize;
        }

        if (cache.has(page)) {
            items.value = {data: cache.get(page)!, page, pageSize, total: cachedTotal, totalPages: cachedTotalPages} as Paginated<T>;
            loading.value = false;
            return;
        }

        loading.value = true;
        error.value = null;
        const result = await apiFn({...params, page, pageSize} as PaginationParams & TFilter);
        if (result.ok) {
            cachedTotal = result.data.total;
            cachedTotalPages = result.data.totalPages;
            cache.set(page, result.data.data);
            items.value = result.data as Paginated<T>;
        } else {
            error.value = result.ctx;
        }
        loading.value = false;
    }

    function invalidate() {
        cache.clear();
        cachedTotal = 0;
        cachedTotalPages = 0;
    }

    return {items, loading, error, fetch, invalidate};
}
