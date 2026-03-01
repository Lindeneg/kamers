import type {TenantsResponse, TenantDetail, PaginationParams} from "@kamers/shared";
import api from "./client";

export type Tenant = TenantDetail;

export function listTenants(params?: Partial<PaginationParams>) {
    return api.get<TenantsResponse["list"]>("/tenants", {params});
}

export function createTenant(input: {
    name: string;
    domains: string[];
    adminEmail: string;
    adminName: string;
}) {
    return api.post<TenantsResponse["create"]>("/tenants", input);
}
