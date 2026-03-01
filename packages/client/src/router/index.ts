import {createRouter, createWebHistory, type RouteLocationNormalized} from "vue-router";
import {PERMISSIONS, type Permission} from "@kamers/shared";
import {useAuthStore} from "../stores/auth";

declare module "vue-router" {
    interface RouteMeta {
        requiresAuth?: boolean;
        requiredPermissions?: Permission[];
        requiresSuperAdmin?: boolean;
    }
}

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/login",
            name: "login",
            component: () => import("../pages/LoginPage.vue"),
        },
        {
            path: "/set-password",
            name: "set-password",
            component: () => import("../pages/SetPasswordPage.vue"),
        },
        {
            path: "/",
            component: () => import("../layouts/AppLayout.vue"),
            meta: {requiresAuth: true},
            children: [
                {
                    path: "",
                    name: "portal",
                    component: () => import("../pages/PortalPage.vue"),
                },
                {
                    path: "shipments",
                    name: "shipments",
                    component: () => import("../pages/ShipmentsPage.vue"),
                    meta: {requiredPermissions: [PERMISSIONS.SHIPMENTS_READ]},
                },
                {
                    path: "bookings",
                    name: "bookings",
                    component: () => import("../pages/BookingsPage.vue"),
                    meta: {requiredPermissions: [PERMISSIONS.BOOKINGS_READ]},
                },
                {
                    path: "containers",
                    name: "containers",
                    component: () => import("../pages/ContainersPage.vue"),
                    meta: {requiredPermissions: [PERMISSIONS.CONTAINERS_READ]},
                },
                {
                    path: "users",
                    name: "users",
                    component: () => import("../pages/UsersPage.vue"),
                    meta: {requiredPermissions: [PERMISSIONS.USERS_READ]},
                },
                {
                    path: "tenants",
                    name: "tenants",
                    component: () => import("../pages/TenantsPage.vue"),
                    meta: {requiresSuperAdmin: true},
                },
                {
                    path: "audit-log",
                    name: "audit-log",
                    component: () => import("../pages/AuditLogPage.vue"),
                    meta: {requiredPermissions: [PERMISSIONS.AUDIT_READ]},
                },
            ],
        },
    ],
});

function hasRequiredAccess(to: RouteLocationNormalized, auth: ReturnType<typeof useAuthStore>): boolean {
    const requiredPerms = to.matched
        .flatMap((r) => r.meta.requiredPermissions ?? []);

    if (requiredPerms.length > 0 && !requiredPerms.every((p) => auth.can(p))) {
        return false;
    }

    const needsSuperAdmin = to.matched.some((r) => r.meta.requiresSuperAdmin);
    if (needsSuperAdmin && !auth.isSuperAdmin) {
        return false;
    }

    return true;
}

router.beforeEach(async (to) => {
    const needsAuth = to.matched.some((r) => r.meta.requiresAuth);
    if (!needsAuth) return true;

    const auth = useAuthStore();

    if (!auth.isAuthenticated) {
        await auth.fetchMe();
    }

    if (!auth.isAuthenticated) {
        return {name: "login", query: {redirect: to.fullPath}};
    }

    if (!hasRequiredAccess(to, auth)) {
        return {name: "portal"};
    }

    return true;
});

export default router;
