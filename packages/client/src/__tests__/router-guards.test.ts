import {describe, it, expect, beforeEach, vi} from "vitest";
import {createRouter, createMemoryHistory} from "vue-router";
import {createPinia, setActivePinia} from "pinia";
import {PERMISSIONS, type Permission} from "@kamers/shared";
import {useAuthStore} from "../stores/auth";

// Mock the auth API so fetchMe doesn't make real requests
vi.mock("../api/auth", () => ({
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    getMe: vi.fn().mockResolvedValue({ok: false, ctx: "not authenticated"}),
    setPassword: vi.fn(),
}));

// Stub page components — router just needs something to resolve
const Stub = {template: "<div />"};

function makeRouter() {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            {path: "/login", name: "login", component: Stub},
            {path: "/set-password", name: "set-password", component: Stub},
            {
                path: "/",
                component: Stub,
                meta: {requiresAuth: true},
                children: [
                    {path: "", name: "portal", component: Stub},
                    {
                        path: "shipments",
                        name: "shipments",
                        component: Stub,
                        meta: {requiredPermissions: [PERMISSIONS.SHIPMENTS_READ]},
                    },
                    {
                        path: "bookings",
                        name: "bookings",
                        component: Stub,
                        meta: {requiredPermissions: [PERMISSIONS.BOOKINGS_READ]},
                    },
                    {
                        path: "containers",
                        name: "containers",
                        component: Stub,
                        meta: {requiredPermissions: [PERMISSIONS.CONTAINERS_READ]},
                    },
                    {
                        path: "users",
                        name: "users",
                        component: Stub,
                        meta: {requiredPermissions: [PERMISSIONS.USERS_READ]},
                    },
                    {
                        path: "tenants",
                        name: "tenants",
                        component: Stub,
                        meta: {requiresSuperAdmin: true},
                    },
                    {
                        path: "audit-log",
                        name: "audit-log",
                        component: Stub,
                        meta: {requiredPermissions: [PERMISSIONS.AUDIT_READ]},
                    },
                ],
            },
        ],
    });

    // Replicate the real guard logic
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

        const requiredPerms = to.matched.flatMap(
            (r) => (r.meta.requiredPermissions as Permission[] | undefined) ?? []
        );
        if (requiredPerms.length > 0 && !requiredPerms.every((p) => auth.can(p))) {
            return {name: "portal"};
        }

        const needsSuperAdmin = to.matched.some((r) => r.meta.requiresSuperAdmin);
        if (needsSuperAdmin && !auth.isSuperAdmin) {
            return {name: "portal"};
        }

        return true;
    });

    return router;
}

function setAuthState(overrides: {
    permissions?: Permission[];
    isSuperAdmin?: boolean;
} = {}) {
    const auth = useAuthStore();
    // Directly set user state to simulate authenticated user
    auth.user = {
        id: "test-user",
        email: "test@example.com",
        name: "Test User",
        tenantId: "test-tenant",
        isSuperAdmin: overrides.isSuperAdmin ?? false,
        pictureUrl: null,
        permissions: overrides.permissions ?? [],
    };
}

describe("router guards", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it("unauthenticated user is redirected to /login with redirect query", async () => {
        const router = makeRouter();
        await router.push("/shipments");
        await router.isReady();

        expect(router.currentRoute.value.name).toBe("login");
        expect(router.currentRoute.value.query.redirect).toBe("/shipments");
    });

    it("authenticated user without permission is redirected to /portal", async () => {
        const router = makeRouter();
        setAuthState({permissions: ["shipments.read"]});

        await router.push("/containers"); // needs containers.read
        await router.isReady();

        expect(router.currentRoute.value.name).toBe("portal");
    });

    it("authenticated user with permission is allowed through", async () => {
        const router = makeRouter();
        setAuthState({permissions: ["shipments.read"]});

        await router.push("/shipments");
        await router.isReady();

        expect(router.currentRoute.value.name).toBe("shipments");
    });

    it("non-super-admin is redirected from /tenants to /portal", async () => {
        const router = makeRouter();
        setAuthState({permissions: Object.values(PERMISSIONS)});

        await router.push("/tenants");
        await router.isReady();

        expect(router.currentRoute.value.name).toBe("portal");
    });

    it("super admin can access /tenants", async () => {
        const router = makeRouter();
        setAuthState({
            permissions: Object.values(PERMISSIONS),
            isSuperAdmin: true,
        });

        await router.push("/tenants");
        await router.isReady();

        expect(router.currentRoute.value.name).toBe("tenants");
    });
});
