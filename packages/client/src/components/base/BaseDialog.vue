<script setup lang="ts">
import {onMounted, onUnmounted} from "vue";
import BaseButton from "./BaseButton.vue";

withDefaults(
    defineProps<{
        open: boolean;
        title: string;
        confirmLabel?: string;
        confirmVariant?: "danger" | "primary" | "secondary";
        loading?: boolean;
    }>(),
    {
        confirmLabel: "Confirm",
        confirmVariant: "danger",
        loading: false,
    }
);

const emit = defineEmits<{
    confirm: [];
    cancel: [];
}>();

function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") emit("cancel");
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="dialog-backdrop" @click.self="emit('cancel')">
            <div class="dialog" role="dialog" aria-modal="true">
                <h3 class="dialog__title">{{ title }}</h3>
                <div class="dialog__body">
                    <slot />
                </div>
                <div class="dialog__footer">
                    <BaseButton variant="ghost" :disabled="loading" @click="emit('cancel')">
                        Cancel
                    </BaseButton>
                    <BaseButton
                        :variant="confirmVariant"
                        :loading="loading"
                        @click="emit('confirm')">
                        {{ confirmLabel }}
                    </BaseButton>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.dialog-backdrop {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
}

.dialog {
    background-color: var(--color-neutral-bg);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    padding: var(--space-6);
    max-width: 420px;
    width: calc(100% - var(--space-8));
}

.dialog__title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--space-3);
}

.dialog__body {
    font-size: var(--font-size-sm);
    color: var(--color-neutral-weak-text);
    line-height: var(--line-height-relaxed);
    margin-bottom: var(--space-6);
}

.dialog__footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
}
</style>
