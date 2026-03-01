import {defineStore} from "pinia";
import {ref, computed} from "vue";
import {hasPermission, hasAllPermissions, type Permission, type MaybeNull} from "@kamers/shared";
import * as authApi from "../api/auth";
import type {MeResponse} from "../api/auth";

export const useAuthStore = defineStore("auth", () => {
    const user = ref<MaybeNull<MeResponse>>(null);
    const loading = ref(false);

    const isAuthenticated = computed(() => user.value !== null);
    const permissions = computed(() => user.value?.permissions ?? []);
    const isSuperAdmin = computed(() => user.value?.isSuperAdmin ?? false);

    function can(permission: Permission | Permission[]): boolean {
        if (Array.isArray(permission)) return hasAllPermissions(permissions.value, permission);
        return hasPermission(permissions.value, permission);
    }

    async function login(email: string, password: string): Promise<void> {
        await authApi.login(email, password);
        await fetchMe();
    }

    async function logout(): Promise<void> {
        await authApi.logout();
        user.value = null;
    }

    async function fetchMe(): Promise<void> {
        loading.value = true;
        try {
            const res = await authApi.getMe();
            user.value = res.data;
        } catch {
            user.value = null;
        } finally {
            loading.value = false;
        }
    }

    return {user, loading, isAuthenticated, permissions, isSuperAdmin, can, login, logout, fetchMe};
});
