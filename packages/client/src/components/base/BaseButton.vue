<script setup lang="ts">
withDefaults(
    defineProps<{
        variant?: "primary" | "secondary" | "danger" | "ghost" | "plain";
        size?: "sm" | "md" | "lg";
        disabled?: boolean;
        loading?: boolean;
        type?: "button" | "submit";
    }>(),
    {
        variant: "primary",
        size: "md",
        disabled: false,
        loading: false,
        type: "button",
    }
);
</script>

<template>
    <button
        :type="type"
        :disabled="disabled || loading"
        class="base-btn"
        :class="[`base-btn--${variant}`, `base-btn--${size}`]">
        <span v-if="loading" class="spinner" aria-hidden="true"></span>
        <slot />
    </button>
</template>

<style scoped>
.base-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-family: var(--font-family);
    font-weight: var(--font-weight-medium);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
        background-color var(--transition-fast),
        color var(--transition-fast),
        box-shadow var(--transition-fast);
    white-space: nowrap;
}

/* Sizes */
.base-btn--sm {
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-sm);
}

.base-btn--md {
    padding: var(--space-2) var(--space-5);
    font-size: var(--font-size-base);
}

.base-btn--lg {
    padding: var(--space-3) var(--space-6);
    font-size: var(--font-size-lg);
}

/* Primary */
.base-btn--primary {
    background-color: var(--color-primary);
    color: var(--color-primary-on);
}

.base-btn--primary:hover:not(:disabled) {
    background-color: var(--color-neutral-weak-text);
}

.base-btn--primary:active:not(:disabled) {
    background-color: var(--color-neutral-weakest-text);
}

/* Secondary */
.base-btn--secondary {
    background-color: var(--color-secondary);
    color: #ffffff;
}

.base-btn--secondary:hover:not(:disabled) {
    background-color: var(--color-secondary-hover);
}

.base-btn--secondary:active:not(:disabled) {
    background-color: var(--color-secondary-active);
}

/* Danger */
.base-btn--danger {
    background-color: var(--color-error);
    color: #ffffff;
}

.base-btn--danger:hover:not(:disabled) {
    opacity: 0.9;
}

/* Ghost (Outlined in kamers DS — medium prominence) */
.base-btn--ghost {
    background-color: transparent;
    color: var(--color-neutral-text);
    border: 1px solid var(--color-neutral-border);
}

.base-btn--ghost:hover:not(:disabled) {
    background-color: var(--color-neutral-weak-bg);
}

/* Plain (low prominence — repetitive actions, links, less critical tasks) */
.base-btn--plain {
    background-color: transparent;
    color: var(--color-error);
    border: none;
    padding-left: var(--space-1);
    padding-right: var(--space-1);
    text-decoration: underline;
    text-underline-offset: 2px;
}

.base-btn--plain:hover:not(:disabled) {
    color: var(--color-neutral-text);
    text-decoration: underline;
}

/* Disabled */
.base-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
