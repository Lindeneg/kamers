<script setup lang="ts">
defineProps<{
    id: string;
    label: string;
    modelValue: string;
    options: {value: string; label: string}[];
    required?: boolean;
    error?: string;
    placeholder?: string;
}>();

defineEmits<{
    "update:modelValue": [value: string];
}>();
</script>

<template>
    <div class="form-select">
        <label :for="id" class="form-select__label">
            {{ label }}
            <span v-if="required" class="form-select__required" aria-hidden="true">*</span>
        </label>
        <select
            :id="id"
            :value="modelValue"
            :required="required"
            :aria-describedby="error ? `${id}-error` : undefined"
            :aria-invalid="!!error"
            class="form-select__field"
            :class="{'form-select__field--error': error}"
            @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
            <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
            <option v-for="opt in options" :key="opt.value" :value="opt.value">
                {{ opt.label }}
            </option>
        </select>
        <p v-if="error" :id="`${id}-error`" class="form-select__error" role="alert">
            {{ error }}
        </p>
    </div>
</template>

<style scoped>
.form-select {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.form-select__label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-neutral-text);
}

.form-select__required {
    color: var(--color-error);
    margin-left: var(--space-1);
}

.form-select__field {
    width: 100%;
    min-width: 0;
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-family);
    font-size: var(--font-size-form);
    line-height: var(--line-height-normal);
    color: var(--color-neutral-text);
    background-color: var(--color-neutral-bg);
    border: 1px solid var(--color-neutral-border);
    border-radius: var(--radius-md);
    transition:
        border-color var(--transition-fast),
        box-shadow var(--transition-fast);
    cursor: pointer;
    appearance: auto;
}

.form-select__field:hover {
    border-color: var(--color-neutral-weak-text);
}

.form-select__field:focus {
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 3px var(--color-secondary-weak-bg);
    outline: none;
}

.form-select__field--error {
    border-color: var(--color-error);
}

.form-select__field--error:focus {
    box-shadow: 0 0 0 3px var(--color-error-weak-bg);
}

.form-select__error {
    font-size: var(--font-size-sm);
    color: var(--color-error);
}
</style>
