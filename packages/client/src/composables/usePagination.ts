import {ref, computed} from "vue";
import type {Paginated, PaginationParams} from "@kamers/shared";

interface UsePaginationOpts {
    defaultPageSize?: number;
}

export function usePagination(opts?: UsePaginationOpts) {
    const page = ref(1);
    const pageSize = ref(opts?.defaultPageSize ?? 10);
    const totalPages = ref(1);
    const total = ref(0);

    const params = computed<PaginationParams>(() => ({
        page: page.value,
        pageSize: pageSize.value,
    }));

    const hasPrev = computed(() => page.value > 1);
    const hasNext = computed(() => page.value < totalPages.value);

    function setFromResponse(response: Paginated<unknown>) {
        totalPages.value = response.totalPages;
        total.value = response.total;
    }

    function prevPage() {
        if (page.value > 1) page.value--;
    }

    function nextPage() {
        if (page.value < totalPages.value) page.value++;
    }

    function resetPage() {
        page.value = 1;
    }

    return {
        page,
        pageSize,
        params,
        totalPages,
        total,
        hasPrev,
        hasNext,
        setFromResponse,
        prevPage,
        nextPage,
        resetPage,
    };
}
