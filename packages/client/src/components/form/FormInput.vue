<script setup lang="ts">
withDefaults(
    defineProps<{
        id: string;
        label: string;
        modelValue: string;
        type?: string;
        required?: boolean;
        error?: string;
        placeholder?: string;
    }>(),
    {
        type: "text",
    }
);

defineEmits<{
    "update:modelValue": [value: string];
}>();
</script>

<template>
    <div class="form-input">
        <label :for="id" class="form-input__label">
            {{ label }}
            <span v-if="required" class="form-input__required" aria-hidden="true">*</span>
        </label>
        <input
            :id="id"
            :type="type"
            :value="modelValue"
            :required="required"
            :placeholder="placeholder"
            :aria-describedby="error ? `${id}-error` : undefined"
            :aria-invalid="!!error"
            class="form-input__field"
            :class="{'form-input__field--error': error}"
            @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
        <p v-if="error" :id="`${id}-error`" class="form-input__error" role="alert">
            {{ error }}
        </p>
    </div>
</template>

<style scoped>
.form-input {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.form-input__label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-neutral-text);
}

.form-input__required {
    color: var(--color-error);
    margin-left: var(--space-1);
}

.form-input__field {
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
}

.form-input__field::placeholder {
    color: var(--color-neutral-weakest-text);
}

.form-input__field:hover {
    border-color: var(--color-neutral-weak-text);
}

.form-input__field:focus {
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 3px var(--color-secondary-weak-bg);
    outline: none;
}

.form-input__field--error {
    border-color: var(--color-error);
}

.form-input__field--error:focus {
    box-shadow: 0 0 0 3px var(--color-error-weak-bg);
}

.form-input__error {
    font-size: var(--font-size-sm);
    color: var(--color-error);
}
</style>
