<script setup lang="ts">
import {ref, watch} from "vue";
import BaseDialog from "./BaseDialog.vue";
import BaseAlert from "./BaseAlert.vue";
import FormInput from "../form/FormInput.vue";
import FormSelect from "../form/FormSelect.vue";

export interface FieldDef {
    key: string;
    label: string;
    type: "text" | "email" | "select" | "date";
    required?: boolean;
    placeholder?: string;
    options?: {value: string; label: string}[];
}

const props = withDefaults(
    defineProps<{
        open: boolean;
        title: string;
        fields: FieldDef[];
        entity?: Record<string, any> | null;
        loading: boolean;
        error: string;
        fieldErrors?: Record<string, string>;
        confirmLabel?: string;
    }>(),
    {
        entity: null,
        fieldErrors: () => ({}),
    }
);

const emit = defineEmits<{
    confirm: [data: Record<string, string>];
    cancel: [];
}>();

const form = ref<Record<string, string>>({});

watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) {
            const initial: Record<string, string> = {};
            for (const field of props.fields) {
                initial[field.key] = props.entity?.[field.key]?.toString() ?? "";
            }
            form.value = initial;
        }
    }
);

function handleConfirm() {
    const cleaned: Record<string, string> = {};
    for (const field of props.fields) {
        const val = form.value[field.key] ?? "";
        if (val !== "" || field.required) cleaned[field.key] = val;
    }
    emit("confirm", cleaned);
}
</script>

<template>
    <BaseDialog
        :open="open"
        :title="title"
        :confirm-label="confirmLabel ?? (entity ? 'Save' : 'Create')"
        confirm-variant="primary"
        :loading="loading"
        @confirm="handleConfirm"
        @cancel="emit('cancel')">
        <div class="entity-form">
            <template v-for="field in fields" :key="field.key">
                <FormSelect
                    v-if="field.type === 'select'"
                    :id="`entity-${field.key}`"
                    :label="field.label"
                    :model-value="form[field.key] ?? ''"
                    :options="field.options ?? []"
                    :required="field.required"
                    :placeholder="field.placeholder"
                    :error="fieldErrors?.[field.key]"
                    @update:model-value="form[field.key] = $event" />
                <FormInput
                    v-else
                    :id="`entity-${field.key}`"
                    :label="field.label"
                    :type="field.type"
                    :model-value="form[field.key] ?? ''"
                    :required="field.required"
                    :placeholder="field.placeholder"
                    :error="fieldErrors?.[field.key]"
                    @update:model-value="form[field.key] = $event" />
            </template>
            <BaseAlert v-if="error" variant="error">{{ error }}</BaseAlert>
        </div>
    </BaseDialog>
</template>

<style scoped>
.entity-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}
</style>
