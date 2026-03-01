<script setup lang="ts">
export type TableColumn = {
    key: string;
    label: string;
    headerClass?: string;
    cellClass?: string;
};

defineProps<{
    columns: TableColumn[];
    rows: Record<string, unknown>[];
    rowKey: string;
}>();
</script>

<template>
    <div v-if="rows.length === 0" class="base-table-empty">
        <slot name="empty" />
    </div>
    <div v-else class="table-wrapper">
        <table class="base-table">
            <thead>
                <tr>
                    <th v-for="col in columns" :key="col.key" :class="col.headerClass">
                        {{ col.label }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in rows" :key="row[rowKey] as string | number">
                    <td v-for="col in columns" :key="col.key" :class="col.cellClass">
                        <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                            {{ row[col.key] }}
                        </slot>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<style scoped>
.table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

.base-table {
    width: 100%;
    font-size: var(--font-size-sm);
}

.base-table th,
.base-table td {
    padding: var(--space-2) var(--space-3);
    text-align: left;
    border-bottom: 1px solid var(--color-neutral-border);
}

.base-table th {
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-neutral-weak-text);
    background-color: var(--color-neutral-weakest-bg);
}

.base-table tbody tr {
    transition: background-color var(--transition-fast);
}

.base-table tbody tr:nth-child(even) {
    background-color: var(--color-neutral-weakest-bg);
}

.base-table tbody tr:hover {
    background-color: var(--color-neutral-weak-bg);
}

@media (min-width: 641px) {
    .base-table th,
    .base-table td {
        padding: var(--space-3) var(--space-4);
    }
}
</style>
