import {defineStore} from "pinia";
import {inviteUser, updateUserPermissions, transferOwnership, listUsers, type User} from "../api/users";
import {usePaginatedStore} from "./paginated";

export const useUsersStore = defineStore("users", () => {
    const list = usePaginatedStore<User, {tenantId?: string}>(listUsers);

    // TODO: Instead of invalidating after each mutation, update the cache in-place:
    // - invite: push the new user into the current page's cached data
    // - updatePermissions: find the user in cache and swap their permissions
    // - transferOwnership: update isTenantAdmin flags on both users in cache
    // Invalidation discards all cached pages and forces a refetch — unnecessary
    // when the API response already contains the updated data.

    async function invite(email: string, name: string) {
        const result = await inviteUser(email, name);
        if (result.ok) list.invalidate();
        return result;
    }

    async function updatePermissions(userId: string, permissions: string[]) {
        const result = await updateUserPermissions(userId, permissions);
        if (result.ok) list.invalidate();
        return result;
    }

    async function transfer(userId: string) {
        const result = await transferOwnership(userId);
        if (result.ok) list.invalidate();
        return result;
    }

    return {...list, invite, updatePermissions, transfer};
});
