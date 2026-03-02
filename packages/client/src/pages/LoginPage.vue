<script setup lang="ts">
import {ref, onMounted} from "vue";
import {useRouter, useRoute} from "vue-router";
import {useAuthStore} from "../stores/auth";
import {getOAuthProviders} from "../api/auth";
import BaseButton from "../components/base/BaseButton.vue";
import BaseAlert from "../components/base/BaseAlert.vue";
import FormInput from "../components/form/FormInput.vue";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const error = ref("");
const submitting = ref(false);
const providers = ref<string[]>([]);

const providerLabels: Record<string, string> = {
    google: "Google",
    microsoft: "Microsoft",
};

onMounted(async () => {
    if (route.query.error === "oauth_failed") {
        error.value = "Sign-in failed. Your account may not exist yet.";
    }

    const result = await getOAuthProviders();
    if (result.ok) {
        providers.value = result.data.providers;
    }
});

function startOAuth(provider: string) {
    window.location.href = `/api/auth/oauth/${provider}`;
}

async function handleSubmit() {
    error.value = "";
    submitting.value = true;
    const result = await auth.login(email.value, password.value);
    if (result.ok) {
        const redirect = (route.query.redirect as string) || "/";
        router.push(redirect);
    } else {
        error.value = result.ctx;
    }
    submitting.value = false;
}
</script>

<template>
    <div class="login-page">
        <div class="login-panel">
            <div class="login-brand">
                <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
                    <rect width="28" height="28" rx="6" fill="#42b0d5" />
                    <path
                        d="M7 10h14M7 14h10M7 18h14"
                        stroke="#fff"
                        stroke-width="2"
                        stroke-linecap="round" />
                </svg>
                <h1>Kamers</h1>
            </div>
            <p class="login-subtitle">Sign in to your account</p>

            <div v-if="providers.length" class="oauth-buttons">
                <BaseButton
                    v-for="provider in providers"
                    :key="provider"
                    variant="secondary"
                    class="oauth-btn"
                    @click="startOAuth(provider)">
                    Sign in with {{ providerLabels[provider] ?? provider }}
                </BaseButton>

                <div class="divider">
                    <span>or</span>
                </div>
            </div>

            <form @submit.prevent="handleSubmit">
                <div class="form-fields">
                    <FormInput
                        id="email"
                        v-model="email"
                        label="Email address"
                        type="email"
                        placeholder="name@company.com"
                        required />
                    <FormInput
                        id="password"
                        v-model="password"
                        label="Password"
                        type="password"
                        placeholder="Enter your password"
                        required />
                </div>

                <BaseAlert v-if="error" variant="error" class="form-error">{{ error }}</BaseAlert>

                <BaseButton type="submit" :loading="submitting" class="submit-btn">
                    {{ submitting ? "Signing in..." : "Sign in" }}
                </BaseButton>
            </form>
        </div>
    </div>
</template>

<style scoped>
.login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--color-neutral-weakest-bg);
}

.login-panel {
    width: 100%;
    max-width: 400px;
    padding: var(--space-10);
    background: var(--color-neutral-bg);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
}

.login-brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-1);
}

.login-brand h1 {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-neutral-text);
}

.login-subtitle {
    margin: var(--space-1) 0 var(--space-8);
    color: var(--color-neutral-weak-text);
}

.oauth-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-bottom: var(--space-5);
}

.oauth-btn {
    width: 100%;
}

.divider {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    color: var(--color-neutral-weak-text);
    font-size: var(--font-size-sm);
}

.divider::before,
.divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--color-neutral-border);
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
