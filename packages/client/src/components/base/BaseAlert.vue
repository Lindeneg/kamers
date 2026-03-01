<script setup lang="ts">
withDefaults(
    defineProps<{
        variant?: "error" | "success" | "warning" | "info";
        dismissible?: boolean;
    }>(),
    {
        variant: "info",
        dismissible: false,
    }
);

const emit = defineEmits<{
    dismiss: [];
}>();
</script>

<template>
    <div class="base-alert" :class="`base-alert--${variant}`" role="alert">
        <div class="base-alert__content">
            <slot />
        </div>
        <button
            v-if="dismissible"
            type="button"
            class="base-alert__dismiss"
            aria-label="Dismiss"
            @click="emit('dismiss')">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        </button>
    </div>
</template>

<style scoped>
.base-alert {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
    animation: slideIn var(--transition-normal) ease-out;
}

.base-alert--error {
    background-color: var(--color-error-weak-bg);
    color: var(--color-error);
    border: 1px solid var(--color-error);
}

.base-alert--success {
    background-color: var(--color-success-weak-bg);
    color: var(--color-success-text);
    border: 1px solid var(--color-success);
}

.base-alert--warning {
    background-color: var(--color-warning-weak-bg);
    color: var(--color-warning-text);
    border: 1px solid var(--color-warning);
}

.base-alert--info {
    background-color: var(--color-info-weak-bg);
    color: var(--color-info);
    border: 1px solid var(--color-info);
}

.base-alert__content {
    flex: 1;
}

.base-alert__dismiss {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    border-radius: var(--radius-sm);
    opacity: 0.7;
    transition: opacity var(--transition-fast);
}

.base-alert__dismiss:hover {
    opacity: 1;
}
</style>
