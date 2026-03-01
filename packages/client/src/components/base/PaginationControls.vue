<script setup lang="ts">
import {computed} from "vue";

const props = defineProps<{
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
}>();

const emit = defineEmits<{
    "update:page": [value: number];
}>();

type PageItem = number | "...";

function range(from: number, to: number): number[] {
    return Array.from({length: to - from + 1}, (_, i) => from + i);
}

function buildPageStrip({current, last}: {current: number; last: number}): PageItem[] {
    if (last <= 5) return range(1, last);

    const nearStart = current <= 3;
    const nearEnd = current >= last - 2;

    if (nearStart) return [...range(1, Math.max(3, current + 1)), "...", last];
    if (nearEnd) return [1, "...", ...range(Math.min(last - 2, current - 1), last)];
    return [1, "...", current, "...", last];
}

const visiblePages = computed(() => buildPageStrip({current: props.page, last: props.totalPages}));

const showingStart = computed(() => (props.page - 1) * props.pageSize + 1);
const showingEnd = computed(() => Math.min(props.page * props.pageSize, props.total));
</script>

<template>
    <div v-if="totalPages > 0" class="pagination">
        <div class="page-strip">
            <button
                class="nav-btn"
                :disabled="page <= 1"
                @click="emit('update:page', page - 1)"
                aria-label="Previous page">
                &lsaquo;
            </button>

            <template v-for="(item, idx) in visiblePages" :key="idx">
                <span v-if="item === '...'" class="ellipsis">&hellip;</span>
                <button
                    v-else
                    class="page-btn"
                    :class="{active: item === page}"
                    @click="emit('update:page', item as number)">
                    {{ item }}
                </button>
            </template>

            <button
                class="nav-btn"
                :disabled="page >= totalPages"
                @click="emit('update:page', page + 1)"
                aria-label="Next page">
                &rsaquo;
            </button>
        </div>

        <p class="entry-count">Showing {{ showingStart }}&ndash;{{ showingEnd }} of {{ total }}</p>
    </div>
</template>

<style scoped>
.pagination {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-6);
}

.page-strip {
    display: flex;
    align-items: center;
    gap: var(--space-1);
}

.nav-btn,
.page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    padding: 0 var(--space-2);
    background: none;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    color: var(--color-neutral-weak-text);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.nav-btn {
    font-size: var(--font-size-lg);
}

.nav-btn:hover:not(:disabled),
.page-btn:hover:not(.active) {
    background: var(--color-neutral-weakest-bg);
    color: var(--color-neutral-text);
}

.nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.page-btn.active {
    color: var(--color-secondary, #42b0d5);
    font-weight: var(--font-weight-bold);
    border-bottom: 2px solid var(--color-secondary, #42b0d5);
    border-radius: 0;
}

.ellipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    font-size: var(--font-size-sm);
    color: var(--color-neutral-weakest-text);
    user-select: none;
}

.entry-count {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--color-neutral-weakest-text);
}
</style>
