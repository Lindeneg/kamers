<script setup lang="ts">
import {computed} from "vue";
import {useRouter} from "vue-router";
import {PERMISSIONS} from "@kamers/shared";
import {useAuthStore} from "../stores/auth";
import {useLoadingTracker} from "../composables/useLoadingTracker";
import BaseButton from "../components/base/BaseButton.vue";
import BaseSpinner from "../components/base/BaseSpinner.vue";

const auth = useAuthStore();
const router = useRouter();
const {isLoading} = useLoadingTracker();

interface NavItem {
    label: string;
    to: string;
    visible: boolean;
    exact?: boolean;
}

const navItems = computed<NavItem[]>(() => [
    {label: "Overview", to: "/", visible: true, exact: true},
    {label: "Shipments", to: "/shipments", visible: auth.can(PERMISSIONS.SHIPMENTS_READ)},
    {label: "Bookings", to: "/bookings", visible: auth.can(PERMISSIONS.BOOKINGS_READ)},
    {label: "Containers", to: "/containers", visible: auth.can(PERMISSIONS.CONTAINERS_READ)},
    {label: "Users", to: "/users", visible: auth.can(PERMISSIONS.USERS_READ)},
    {label: "Tenants", to: "/tenants", visible: auth.isSuperAdmin},
    {label: "Audit Log", to: "/audit-log", visible: auth.can(PERMISSIONS.AUDIT_READ)},
]);

const visibleNav = computed(() => navItems.value.filter((item) => item.visible));

function handleLogout() {
    auth.logout();
    router.push("/login");
}
</script>

<template>
    <div class="app-layout">
        <aside class="sidebar">
            <div class="sidebar-brand">
                <svg class="brand-icon" width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <rect width="28" height="28" rx="6" fill="#42b0d5" />
                    <path
                        d="M7 10h14M7 14h10M7 18h14"
                        stroke="#fff"
                        stroke-width="2"
                        stroke-linecap="round" />
                </svg>
                <span class="brand-name">Kamers</span>
            </div>

            <nav class="sidebar-nav">
                <span class="nav-section">Navigation</span>
                <ul class="nav-list">
                    <li v-for="item in visibleNav" :key="item.to">
                        <RouterLink
                            :to="item.to"
                            class="nav-link"
                            :class="{exact: item.exact}"
                            :active-class="item.exact ? '' : 'is-active'"
                            :exact-active-class="item.exact ? 'is-active' : ''">
                            {{ item.label }}
                        </RouterLink>
                    </li>
                </ul>
            </nav>

            <div class="sidebar-footer">
                <div class="user-card">
                    <div class="user-avatar">
                        {{ auth.user?.name?.charAt(0)?.toUpperCase() }}
                    </div>
                    <div class="user-details">
                        <span class="user-name">{{ auth.user?.name }}</span>
                        <span class="user-email">{{ auth.user?.email }}</span>
                    </div>
                </div>
                <BaseButton variant="ghost" size="sm" @click="handleLogout">Sign out</BaseButton>
            </div>
        </aside>

        <main class="main">
            <BaseSpinner v-if="isLoading" class="global-spinner" size="md" />
            <div class="main-content">
                <RouterView />
            </div>
        </main>
    </div>
</template>

<style scoped>
.app-layout {
    display: flex;
    min-height: 100vh;
}

.sidebar {
    width: 250px;
    min-width: 250px;
    background: var(--color-primary);
    color: var(--color-primary-on);
    display: flex;
    flex-direction: column;
}

.sidebar-brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-name {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.02em;
}

.sidebar-nav {
    flex: 1;
    padding: var(--space-5) 0;
    overflow-y: auto;
}

.nav-section {
    display: block;
    padding: 0 var(--space-6);
    margin-bottom: var(--space-2);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.4);
}

.nav-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.nav-link {
    display: block;
    padding: var(--space-2) var(--space-6);
    margin: 1px var(--space-3);
    border-radius: var(--radius-md);
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-fast);
}

.nav-link:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
    text-decoration: none;
}

.nav-link.is-active {
    color: #fff;
    background: rgba(66, 176, 213, 0.2);
}

.sidebar-footer {
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.user-card {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
}

.user-avatar {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background: var(--color-secondary);
    color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    flex-shrink: 0;
}

.user-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.user-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-email {
    font-size: var(--font-size-xs);
    color: rgba(255, 255, 255, 0.5);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sidebar-footer :deep(.base-btn) {
    width: 100%;
    color: rgba(255, 255, 255, 0.7);
    border-color: rgba(255, 255, 255, 0.12);
}

.sidebar-footer :deep(.base-btn:hover) {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
}

.main {
    flex: 1;
    overflow-y: auto;
    position: relative;
}

.global-spinner {
    position: absolute;
    bottom: var(--space-4);
    right: var(--space-4);
    z-index: 100;
}

.main-content {
    max-width: 1100px;
    margin: 0 auto;
    padding: var(--space-10) var(--space-12);
}
</style>
