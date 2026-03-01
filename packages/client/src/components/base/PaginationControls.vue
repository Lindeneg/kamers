<script setup lang="ts">
import {computed} from "vue";

const props = withDefaults(defineProps<{
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    pageSizeOptions?: number[];
}>(), {
    pageSizeOptions: () => [10, 20, 50],
});

const emit = defineEmits<{
    "update:page": [value: number];
    "update:pageSize": [value: number];
}>();

const pageOptions = computed(() =>
    Array.from({length: props.totalPages}, (_, i) => i + 1)
);

function prev() {
    if (props.page > 1) emit("update:page", props.page - 1);
}

function next() {
    if (props.page < props.totalPages) emit("update:page", props.page + 1);
}

function onPageSelect(e: Event) {
    emit("update:page", Number((e.target as HTMLSelectElement).value));
}

function onPageSizeChange(e: Event) {
    emit("update:pageSize", Number((e.target as HTMLSelectElement).value));
}

</script>

<template>
    <div v-if="totalPages > 0" class="pagination">
        <button class="nav-btn" :disabled="page <= 1" aria-label="Previous page" @click="prev">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>

        <select class="page-select" :value="page" @change="onPageSelect">
            <option v-for="p in pageOptions" :key="p" :value="p">{{ p }}</option>
        </select>
        <span class="label">of {{ totalPages }}</span>

        <button class="nav-btn" :disabled="page >= totalPages" aria-label="Next page" @click="next">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>

        <span class="separator" />

        <select class="size-select" :value="pageSize" @change="onPageSizeChange">
            <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }} / page</option>
        </select>
    </div>
</template>

<style scoped>
.pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
}

.nav-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    color: var(--color-neutral-weak-text);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.nav-btn:hover:not(:disabled) {
    border-color: var(--color-neutral-border);
    color: var(--color-neutral-text);
}

.nav-btn:disabled {
    opacity: 0.25;
    cursor: not-allowed;
}

.page-select,
.size-select {
    height: 28px;
    padding: 0 var(--space-5) 0 var(--space-2);
    border: 1px solid var(--color-neutral-border);
    border-radius: var(--radius-md);
    background: var(--color-neutral-bg);
    font-size: var(--font-size-xs);
    color: var(--color-neutral-text);
    cursor: pointer;
}

.page-select {
    min-width: 48px;
    text-align: center;
}

.size-select {
    color: var(--color-neutral-weak-text);
}

.label {
    font-size: var(--font-size-xs);
    color: var(--color-neutral-weak-text);
}

.separator {
    width: 1px;
    height: 16px;
    background: var(--color-neutral-border);
    margin: 0 var(--space-1);
}
</style>
