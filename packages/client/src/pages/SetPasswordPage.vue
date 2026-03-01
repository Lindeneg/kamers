<script setup lang="ts">
import {ref} from "vue";
import {useRoute, useRouter} from "vue-router";
import {setPassword} from "../api/auth";
import BaseButton from "../components/base/BaseButton.vue";
import BaseAlert from "../components/base/BaseAlert.vue";
import FormInput from "../components/form/FormInput.vue";

const route = useRoute();
const router = useRouter();

const token = (route.query.token as string) ?? "";
const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const done = ref(false);
const submitting = ref(false);

async function handleSubmit() {
    if (password.value !== confirmPassword.value) {
        error.value = "Passwords do not match";
        return;
    }

    error.value = "";
    submitting.value = true;
    try {
        await setPassword(token, password.value);
        done.value = true;
    } catch (e: any) {
        error.value = e.response?.data?.msg ?? "Something went wrong. Please try again later.";
    } finally {
        submitting.value = false;
    }
}

function goToLogin() {
    router.push("/login");
}
</script>

<template>
    <div class="set-password-page">
        <div class="panel">
            <template v-if="done">
                <div class="success-icon">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="24" fill="var(--color-success-weak-bg)" />
                        <path
                            d="M15 24l6 6 12-12"
                            stroke="var(--color-success)"
                            stroke-width="3"
                            stroke-linecap="round"
                            stroke-linejoin="round" />
                    </svg>
                </div>
                <h1>You're all set</h1>
                <p class="subtitle">Your password has been configured. You can now sign in to your account.</p>
                <BaseButton class="submit-btn" @click="goToLogin">Continue to sign in</BaseButton>
            </template>
            <template v-else-if="!token">
                <h1>Invalid link</h1>
                <p class="subtitle">This invite link is missing a token. Please check your email for the correct link.</p>
            </template>
            <template v-else>
                <h1>Set your password</h1>
                <p class="subtitle">Create a password to complete your account setup.</p>
                <form @submit.prevent="handleSubmit">
                    <div class="form-fields">
                        <FormInput
                            id="password"
                            v-model="password"
                            label="Password"
                            type="password"
                            placeholder="At least 8 characters"
                            required />
                        <FormInput
                            id="confirm"
                            v-model="confirmPassword"
                            label="Confirm password"
                            type="password"
                            placeholder="Re-enter your password"
                            required />
                    </div>

                    <BaseAlert v-if="error" variant="error" class="form-error">{{ error }}</BaseAlert>

                    <BaseButton type="submit" :loading="submitting" class="submit-btn">
                        {{ submitting ? "Setting password..." : "Set password" }}
                    </BaseButton>
                </form>
            </template>
        </div>
    </div>
</template>

<style scoped>
.set-password-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--color-neutral-weakest-bg);
}

.panel {
    width: 100%;
    max-width: 400px;
    padding: var(--space-10);
    background: var(--color-neutral-bg);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
}

.panel h1 {
    margin: 0 0 var(--space-1);
    font-size: var(--font-size-xl);
    color: var(--color-neutral-text);
}

.subtitle {
    margin: 0 0 var(--space-8);
    color: var(--color-neutral-weak-text);
}

.success-icon {
    margin-bottom: var(--space-5);
}

.form-fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    margin-bottom: var(--space-5);
}

.form-error {
    margin-bottom: var(--space-5);
}

.submit-btn {
    width: 100%;
}
</style>
