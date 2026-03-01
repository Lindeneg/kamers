import {computed} from "vue";
import {useRoute, useRouter} from "vue-router";

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
