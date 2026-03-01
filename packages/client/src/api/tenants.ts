import type {TenantsResponse, TenantDetail, PaginationParams} from "@kamers/shared";
import api from "./client";
import {wrap} from "./wrap";

export type Tenant = TenantDetail;

export function listTenants(params?: Partial<PaginationParams>) {
    return wrap(api.get<TenantsResponse["list"]>("/tenants", {params}));
}

export function createTenant(input: {
    name: string;
    domains: string[];
    adminEmail: string;
    adminName: string;
}) {
    return wrap(api.post<TenantsResponse["create"]>("/tenants", input));
}
