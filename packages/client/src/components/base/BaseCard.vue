<script setup lang="ts">
defineProps<{
    title?: string;
}>();
</script>

<template>
    <div class="base-card">
        <div v-if="title || $slots.title" class="base-card__header">
            <slot name="title">
                <h2 class="base-card__title">{{ title }}</h2>
            </slot>
        </div>
        <div class="base-card__body">
            <slot />
        </div>
    </div>
</template>

<style scoped>
.base-card {
    background-color: var(--color-neutral-bg);
    border: 1px solid var(--color-neutral-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    transition:
        box-shadow var(--transition-normal),
        background-color var(--transition-normal);
}

.base-card:hover {
    box-shadow: var(--shadow-md);
}

.base-card__header {
    padding: var(--space-4) var(--space-4);
    border-bottom: 1px solid var(--color-neutral-border);
}

.base-card__title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-neutral-text);
    line-height: var(--line-height-tight);
}

.base-card__body {
    padding: var(--space-4);
}

@media (min-width: 641px) {
    .base-card {
        border-radius: var(--radius-xl);
    }

    .base-card__header {
        padding: var(--space-5) var(--space-6);
    }

    .base-card__title {
        font-size: var(--font-size-xl);
    }

    .base-card__body {
        padding: var(--space-6);
    }
}
</style>
