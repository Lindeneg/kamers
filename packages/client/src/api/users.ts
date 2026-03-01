import type {UsersResponse, UserDetail, PaginationParams} from "@kamers/shared";
import api from "./client";
import {wrap} from "./wrap";

export type User = UserDetail;

export function listUsers(params?: Partial<PaginationParams> & {tenantId?: string}) {
    return wrap(api.get<UsersResponse["list"]>("/users", {params}));
}

export function inviteUser(email: string, name: string) {
    return wrap(api.post<UsersResponse["invite"]>("/users/invite", {email, name}));
}

export function updateUserPermissions(userId: string, permissions: string[]) {
    return wrap(api.put<UsersResponse["updatePermissions"]>(`/users/${userId}/permissions`, {permissions}));
}

export function transferOwnership(userId: string) {
    return wrap(api.put<UsersResponse["transferOwnership"]>(`/users/${userId}/transfer-ownership`));
}

export function toggleUserActive(userId: string, isActive: boolean) {
    return wrap(api.patch<UsersResponse["toggleActive"]>(`/users/${userId}/active`, {isActive}));
}

export function deleteUser(userId: string) {
    return wrap(api.delete<UsersResponse["deleteUser"]>(`/users/${userId}`));
}
