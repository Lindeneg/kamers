import {describe, it, expect, beforeEach, vi} from "vitest";
import {mount} from "@vue/test-utils";
import {createPinia, setActivePinia} from "pinia";
import {createRouter, createMemoryHistory} from "vue-router";
import {PERMISSIONS, type Permission} from "@kamers/shared";
import {useAuthStore} from "../stores/auth";
import PortalPage from "../pages/PortalPage.vue";
import AppLayout from "../layouts/AppLayout.vue";

// Mock api modules that may be imported transitively
vi.mock("../api/auth", () => ({
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    getMe: vi.fn().mockResolvedValue({ok: false, ctx: "not authenticated"}),
    setPassword: vi.fn(),
}));

// Stub the loading tracker composable
vi.mock("../composables/useLoadingTracker", () => ({
    useLoadingTracker: () => ({isLoading: false}),
}));

const Stub = {template: "<div />"};

function makeRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            {path: "/", name: "portal", component: Stub},
            {path: "/shipments", name: "shipments", component: Stub},
            {path: "/bookings", name: "bookings", component: Stub},
            {path: "/containers", name: "containers", component: Stub},
            {path: "/users", name: "users", component: Stub},
            {path: "/tenants", name: "tenants", component: Stub},
            {path: "/audit-log", name: "audit-log", component: Stub},
            {path: "/login", name: "login", component: Stub},
        ],
    });
}

function setAuthState(overrides: {
    permissions?: Permission[];
    isSuperAdmin?: boolean;
} = {}) {
    const auth = useAuthStore();
    auth.user = {
        id: "test-user",
        email: "test@example.com",
        name: "Test User",
        tenantId: "test-tenant",
        isSuperAdmin: overrides.isSuperAdmin ?? false,
        permissions: overrides.permissions ?? [],
    };
}

describe("permission-based rendering", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it("portal shows only cards for granted permissions", async () => {
        const router = makeRouter();
        await router.push("/");
        await router.isReady();

        setAuthState({permissions: ["shipments.read", "bookings.read"]});

        const wrapper = mount(PortalPage, {
            global: {plugins: [router]},
        });

        const cardLabels = wrapper.findAll(".portal-card h3").map((el) => el.text());
        expect(cardLabels).toContain("Shipments");
        expect(cardLabels).toContain("Bookings");
        expect(cardLabels).not.toContain("Containers");
        expect(cardLabels).not.toContain("Users");
        expect(cardLabels).not.toContain("Tenants");
        expect(cardLabels).not.toContain("Audit Log");
    });

    it("portal shows Tenants card only for super admin", async () => {
        const router = makeRouter();
        await router.push("/");
        await router.isReady();

        setAuthState({
            permissions: Object.values(PERMISSIONS),
            isSuperAdmin: true,
        });

        const wrapper = mount(PortalPage, {
            global: {plugins: [router]},
        });

        const cardLabels = wrapper.findAll(".portal-card h3").map((el) => el.text());
        expect(cardLabels).toContain("Tenants");
    });

    it("sidebar shows only nav items for granted permissions", async () => {
        const router = makeRouter();
        await router.push("/");
        await router.isReady();

        setAuthState({permissions: ["shipments.read"]});

        const wrapper = mount(AppLayout, {
            global: {
                plugins: [router],
                stubs: {
                    BaseButton: {template: "<button><slot /></button>"},
                    BaseSpinner: {template: "<div />"},
                },
            },
        });

        const navLabels = wrapper.findAll(".nav-link").map((el) => el.text());
        expect(navLabels).toContain("Overview");
        expect(navLabels).toContain("Shipments");
        expect(navLabels).not.toContain("Bookings");
        expect(navLabels).not.toContain("Containers");
        expect(navLabels).not.toContain("Users");
        expect(navLabels).not.toContain("Tenants");
    });
});
