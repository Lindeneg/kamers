<script setup lang="ts">
import {useShipmentsStore} from "../stores/shipments";
import {usePaginatedResource} from "../composables/usePaginatedRoute";
import BaseCard from "../components/base/BaseCard.vue";
import BaseTable, {type TableColumn} from "../components/base/BaseTable.vue";
import BaseAlert from "../components/base/BaseAlert.vue";
import PaginationControls from "../components/base/PaginationControls.vue";

const columns: TableColumn[] = [
    {key: "id", label: "Shipment ID", cellClass: "cell-mono"},
    {key: "origin", label: "Origin"},
    {key: "destination", label: "Destination"},
    {key: "status", label: "Status"},
];

const store = useShipmentsStore();
const {page, pageSize, onPageChange, onPageSizeChange} = usePaginatedResource(store);
</script>

<template>
    <div>
        <div class="page-header">
            <h1>Shipments</h1>
        </div>

        <BaseAlert v-if="store.error" variant="error">{{ store.error }}</BaseAlert>
        <template v-else>
            <PaginationControls
                v-if="store.items && store.items.totalPages > 0"
                :page="page"
                :total-pages="store.items.totalPages"
                :total="store.items.total"
                :page-size="pageSize"
                @update:page="onPageChange"
                @update:page-size="onPageSizeChange" />

            <BaseCard>
                <BaseTable
                    :columns="columns"
                    :rows="store.items?.data ?? []"
                    :loading="store.loading"
                    :expected-count="pageSize"
                    row-key="id">
                    <template #cell-id="{value}">
                        <span class="cell-mono">{{ value }}</span>
                    </template>
                    <template #cell-status="{value}">
                        <span class="badge" :class="value as string">
                            {{ (value as string).replace('_', ' ') }}
                        </span>
                    </template>
                </BaseTable>
            </BaseCard>
        </template>
    </div>
</template>

<style scoped>
.page-header {
    margin-bottom: var(--space-6);
}

.page-header h1 {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
}

.cell-mono {
    font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
    font-size: var(--font-size-sm);
    color: var(--color-neutral-weak-text);
}

.badge {
    display: inline-block;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    text-transform: capitalize;
}

.badge.in_transit {
    background: var(--color-info-weak-bg);
    color: var(--color-info);
}

.badge.delivered {
    background: var(--color-success-weak-bg);
    color: var(--color-success);
}

.badge.pending {
    background: var(--color-warning-weak-bg);
    color: var(--color-warning-text);
}

.badge.customs_hold {
    background: var(--color-error-weak-bg);
    color: var(--color-error);
}

.badge.cancelled {
    background: var(--color-neutral-weakest-bg);
    color: var(--color-neutral-weak-text);
}
</style>
