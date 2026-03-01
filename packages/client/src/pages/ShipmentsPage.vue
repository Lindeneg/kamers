<script setup lang="ts">
import {watch} from "vue";
import type {Paginated} from "@kamers/shared";
import {useApiCall} from "../composables/useApiCall";
import {usePagination} from "../composables/usePagination";
import {listShipments, type Shipment} from "../api/shipments";
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

const pag = usePagination();

const {data: shipments, loading, error, execute: fetchShipments} = useApiCall<Paginated<Shipment>>(
    () => listShipments(pag.params.value)
);

async function fetch() {
    await fetchShipments();
    if (shipments.value) pag.setFromResponse(shipments.value);
}

watch(pag.params, fetch, {immediate: true});
</script>

<template>
    <div>
        <div class="page-header">
            <h1>Shipments</h1>
        </div>

        <div v-if="loading" class="empty-state">Loading...</div>
        <BaseAlert v-else-if="error" variant="error">{{ error }}</BaseAlert>
        <template v-else-if="shipments?.data.length">
            <BaseCard>
                <BaseTable :columns="columns" :rows="(shipments.data as unknown as Record<string, unknown>[])" row-key="id">
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

            <PaginationControls
                v-model:page="pag.page.value"
                v-model:page-size="pag.pageSize.value"
                :total-pages="pag.totalPages.value"
                :total="pag.total.value" />
        </template>
        <div v-else class="empty-state">No shipments found.</div>
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

.empty-state {
    text-align: center;
    padding: var(--space-12) var(--space-4);
    color: var(--color-neutral-weak-text);
}
</style>
