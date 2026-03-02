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
                <button
                    v-for="provider in providers"
                    :key="provider"
                    class="oauth-btn"
                    :class="`oauth-btn--${provider}`"
                    @click="startOAuth(provider)">
                    <!-- Google G icon -->
                    <svg v-if="provider === 'google'" class="oauth-icon" width="18" height="18" viewBox="0 0 18 18">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                    <!-- Microsoft squares icon -->
                    <svg v-if="provider === 'microsoft'" class="oauth-icon" width="18" height="18" viewBox="0 0 21 21">
                        <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                        <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                        <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                        <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                    </svg>
                    Sign in with {{ providerLabels[provider] ?? provider }}
                </button>

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
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: #fff;
    color: #3c4043;
    border: 1px solid #dadce0;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    transition: background-color 0.15s, box-shadow 0.15s;
}

.oauth-btn:hover {
    background: #f8f9fa;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.oauth-btn:active {
    background: #f1f3f4;
}

.oauth-icon {
    flex-shrink: 0;
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
