import {computed, onMounted} from "vue";
import {useRoute, useRouter} from "vue-router";

interface PaginatedStore {
    fetch(params: Record<string, any>): any;
    invalidate(): void;
}

export function usePaginatedRoute(opts?: {defaultPageSize?: number}) {
    const route = useRoute();
    const router = useRouter();
    const defaultSize = opts?.defaultPageSize ?? 10;

    const page = computed(() => Math.max(1, Number(route.query.page) || 1));
    const pageSize = computed(() => Math.max(1, Number(route.query.pageSize) || defaultSize));

    function setPage(p: number) {
        router.replace({query: {...route.query, page: String(p)}});
    }

    function setPageSize(size: number) {
        router.replace({query: {...route.query, pageSize: String(size), page: "1"}});
    }

    function setFilter(key: string, value: string) {
        const query: Record<string, string | undefined> = {...route.query as Record<string, string>, [key]: value || undefined, page: "1"};
        if (!value) delete query[key];
        router.replace({query});
    }

    function getFilter(key: string): string {
        return (route.query[key] as string) ?? "";
    }

    return {page, pageSize, setPage, setPageSize, setFilter, getFilter};
}

export function usePaginatedResource(
    store: PaginatedStore,
    opts?: {defaultPageSize?: number; filterKeys?: string[]},
) {
    const pag = usePaginatedRoute(opts);
    const filterKeys = opts?.filterKeys ?? [];

    function buildParams(overrides: Record<string, any> = {}) {
        const params: Record<string, any> = {
            page: overrides.page ?? pag.page.value,
            pageSize: overrides.pageSize ?? pag.pageSize.value,
        };
        for (const key of filterKeys) {
            const val = key in overrides ? overrides[key] : pag.getFilter(key);
            if (val) params[key] = val;
        }
        return params;
    }

    onMounted(() => store.fetch(buildParams()));

    function onPageChange(p: number) {
        pag.setPage(p);
        store.fetch(buildParams({page: p}));
    }

    function onPageSizeChange(size: number) {
        pag.setPageSize(size);
        store.fetch(buildParams({page: 1, pageSize: size}));
    }

    function onFilterChange(key: string, value: string) {
        pag.setFilter(key, value);
        store.invalidate();
        store.fetch(buildParams({page: 1, [key]: value || undefined}));
    }

    function refetch() {
        store.fetch(buildParams());
    }

    return {
        page: pag.page,
        pageSize: pag.pageSize,
        getFilter: pag.getFilter,
        onPageChange,
        onPageSizeChange,
        onFilterChange,
        refetch,
    };
}
