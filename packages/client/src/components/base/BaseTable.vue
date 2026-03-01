<script setup lang="ts" generic="T extends Record<string, any>">
export type TableColumn = {
    key: string;
    label: string;
    headerClass?: string;
    cellClass?: string;
};

defineProps<{
    columns: TableColumn[];
    rows: T[];
    rowKey: string;
    loading?: boolean;
    expectedCount?: number;
}>();

const placeholderRows = Array.from({length: 5}, (_, i) => i);
</script>

<template>
    <div class="table-wrapper">
        <div
            v-if="expectedCount && !loading && rows.length > 0 && rows.length !== expectedCount"
            class="table-count">
            {{ rows.length }} {{ rows.length === 1 ? "entry" : "entries" }}
        </div>
        <table class="base-table">
            <thead>
                <tr>
                    <th v-for="col in columns" :key="col.key" :class="col.headerClass">
                        {{ col.label }}
                    </th>
                </tr>
            </thead>
            <tbody v-if="loading">
                <tr v-for="i in placeholderRows" :key="i">
                    <td v-for="col in columns" :key="col.key" :class="col.cellClass">
                        <span class="skeleton" />
                    </td>
                </tr>
            </tbody>
            <tbody v-else-if="rows.length === 0">
                <tr>
                    <td :colspan="columns.length" class="empty-cell">
                        <slot name="empty">No data</slot>
                    </td>
                </tr>
            </tbody>
            <tbody v-else>
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

.table-count {
    font-size: var(--font-size-xs);
    color: var(--color-neutral-weakest-text);
    padding: 0 var(--space-1) var(--space-2);
}

.empty-cell {
    text-align: center;
    padding: var(--space-12) var(--space-4);
    color: var(--color-neutral-weak-text);
}

.skeleton {
    display: block;
    height: 14px;
    width: 70%;
    background: var(--color-neutral-weakest-bg);
    border-radius: var(--radius-sm);
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%,
    100% {
        opacity: 0.4;
    }
    50% {
        opacity: 1;
    }
}

@media (min-width: 641px) {
    .base-table th,
    .base-table td {
        padding: var(--space-3) var(--space-4);
    }
}
</style>
