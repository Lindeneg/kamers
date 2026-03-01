<script setup lang="ts">
const props = defineProps<{
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    pageSizeOptions?: number[];
}>();

const emit = defineEmits<{
    "update:page": [value: number];
    "update:pageSize": [value: number];
}>();

const sizeOptions = props.pageSizeOptions ?? [10, 20, 50];

function onPageSizeChange(e: Event) {
    const value = Number((e.target as HTMLSelectElement).value);
    emit("update:pageSize", value);
    emit("update:page", 1);
}
</script>

<template>
    <div v-if="totalPages > 0" class="pagination">
        <label class="page-size-control">
            Rows per page:
            <select :value="pageSize" @change="onPageSizeChange">
                <option v-for="opt in sizeOptions" :key="opt" :value="opt">{{ opt }}</option>
            </select>
        </label>
        <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
        <button class="page-btn" :disabled="page <= 1" @click="emit('update:page', page - 1)">&larr; Prev</button>
        <button class="page-btn" :disabled="page >= totalPages" @click="emit('update:page', page + 1)">Next &rarr;</button>
    </div>
</template>

<style scoped>
.pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    margin-top: var(--space-6);
}

.page-size-control {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-neutral-weak-text);
}

.page-size-control select {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-neutral-border);
    border-radius: var(--radius-md);
    background: var(--color-neutral-bg);
    font-size: var(--font-size-sm);
    cursor: pointer;
}

.page-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-neutral-bg);
    border: 1px solid var(--color-neutral-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.page-btn:hover:not(:disabled) {
    background: var(--color-neutral-weak-bg);
}

.page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.page-info {
    font-size: var(--font-size-sm);
    color: var(--color-neutral-weak-text);
}
</style>
