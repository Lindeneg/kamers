<script setup lang="ts">
import {computed} from "vue";
import {PERMISSIONS} from "@kamers/shared";
import {useAuthStore} from "../stores/auth";

const auth = useAuthStore();

interface PortalCard {
    label: string;
    description: string;
    to: string;
    visible: boolean;
}

const cards = computed<PortalCard[]>(() => [
    {
        label: "Shipments",
        description: "Track and manage ocean freight shipments across routes",
        to: "/shipments",
        visible: auth.can(PERMISSIONS.SHIPMENTS_READ),
    },
    {
        label: "Bookings",
        description: "View, create, and manage cargo bookings",
        to: "/bookings",
        visible: auth.can(PERMISSIONS.BOOKINGS_READ),
    },
    {
        label: "Containers",
        description: "Monitor container locations and status updates",
        to: "/containers",
        visible: auth.can(PERMISSIONS.CONTAINERS_READ),
    },
    {
        label: "Users",
        description: "Manage team members, roles, and access permissions",
        to: "/users",
        visible: auth.can(PERMISSIONS.USERS_READ),
    },
    {
        label: "Tenants",
        description: "Create and manage organization tenants",
        to: "/tenants",
        visible: auth.isSuperAdmin,
    },
    {
        label: "Audit Log",
        description: "Review activity history and security events",
        to: "/audit-log",
        visible: auth.can(PERMISSIONS.AUDIT_READ),
    },
]);

const visibleCards = computed(() => cards.value.filter((c) => c.visible));
</script>

<template>
    <div class="portal-page">
        <div class="page-header">
            <h1>Welcome back, {{ auth.user?.name }}</h1>
            <p class="page-description">Access your logistics tools and manage operations.</p>
        </div>

        <div class="card-grid">
            <RouterLink v-for="card in visibleCards" :key="card.to" :to="card.to" class="portal-card">
                <h3>{{ card.label }}</h3>
                <p>{{ card.description }}</p>
                <span class="card-arrow">&rarr;</span>
            </RouterLink>
        </div>
    </div>
</template>

<style scoped>
.page-header {
    margin-bottom: var(--space-8);
}

.page-header h1 {
    margin: 0 0 var(--space-1);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
}

.page-description {
    margin: 0;
    color: var(--color-neutral-weak-text);
}

.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--space-4);
}

.portal-card {
    position: relative;
    padding: var(--space-6);
    background: var(--color-neutral-bg);
    border: 1px solid var(--color-neutral-border);
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: var(--color-neutral-text);
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-sm);
}

.portal-card:hover {
    border-color: var(--color-secondary);
    box-shadow: var(--shadow-md);
    text-decoration: none;
}

.portal-card h3 {
    margin: 0 0 var(--space-1);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
    color: var(--color-neutral-text);
}

.portal-card p {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-neutral-weak-text);
    line-height: var(--line-height-normal);
}

.card-arrow {
    position: absolute;
    top: var(--space-6);
    right: var(--space-6);
    font-size: var(--font-size-lg);
    color: var(--color-neutral-weakest-text);
    transition:
        color var(--transition-fast),
        transform var(--transition-fast);
}

.portal-card:hover .card-arrow {
    color: var(--color-secondary);
    transform: translateX(2px);
}
</style>
