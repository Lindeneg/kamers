import type {AuthResponse} from "@kamers/shared";
import api from "./client";
import {wrap} from "./wrap";

export type MeResponse = AuthResponse["me"];

export function login(email: string, password: string) {
    return wrap(api.post<AuthResponse["login"]>("/auth/login", {email, password}));
}

export function logout() {
    return wrap(api.post<AuthResponse["logout"]>("/auth/logout"));
}

export function refresh() {
    return wrap(api.post<AuthResponse["refresh"]>("/auth/refresh"));
}

export function getMe() {
    return wrap(api.get<MeResponse>("/auth/me"));
}

export function setPassword(token: string, password: string) {
    return wrap(api.post<AuthResponse["setPassword"]>("/auth/set-password", {token, password}));
}

export function getOAuthProviders() {
    return wrap(api.get<AuthResponse["oauthProviders"]>("/auth/oauth/providers"));
}
