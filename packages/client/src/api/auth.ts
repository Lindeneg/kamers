import type {AuthResponse} from "@kamers/shared";
import api from "./client";

export type MeResponse = AuthResponse["me"];

export function login(email: string, password: string) {
    return api.post<AuthResponse["login"]>("/auth/login", {email, password});
}

export function logout() {
    return api.post<AuthResponse["logout"]>("/auth/logout");
}

export function refresh() {
    return api.post<AuthResponse["refresh"]>("/auth/refresh");
}

export function getMe() {
    return api.get<MeResponse>("/auth/me");
}

export function setPassword(token: string, password: string) {
    return api.post<AuthResponse["setPassword"]>("/auth/set-password", {token, password});
}
