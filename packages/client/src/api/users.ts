import type {UsersResponse, UserDetail, PaginationParams} from "@kamers/shared";
import api from "./client";

export type User = UserDetail;

export function listUsers(params?: Partial<PaginationParams> & {tenantId?: string}) {
    return api.get<UsersResponse["list"]>("/users", {params});
}

export function inviteUser(email: string, name: string) {
    return api.post<UsersResponse["invite"]>("/users/invite", {email, name});
}

export function updateUserPermissions(userId: string, permissions: string[]) {
    return api.put<UsersResponse["updatePermissions"]>(`/users/${userId}/permissions`, {permissions});
}

export function transferOwnership(userId: string) {
    return api.put<UsersResponse["transferOwnership"]>(`/users/${userId}/transfer-ownership`);
}
