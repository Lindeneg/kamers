<script setup lang="ts">
withDefaults(
    defineProps<{
        size?: "sm" | "md";
    }>(),
    {size: "sm"}
);
</script>

<template>
    <span class="spinner" :class="size" role="status" aria-label="Loading" />
</template>

<style scoped>
.spinner {
    display: inline-block;
    border: 2px solid var(--color-neutral-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
}

.sm {
    width: 16px;
    height: 16px;
}

.md {
    width: 24px;
    height: 24px;
    border-width: 3px;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
