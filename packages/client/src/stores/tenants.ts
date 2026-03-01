import {defineStore} from "pinia";
import type {TenantDetail} from "@kamers/shared";
import {listTenants} from "../api/tenants";
import {usePaginatedStore} from "./paginated";

export const useTenantsStore = defineStore("tenants", () =>
    usePaginatedStore<TenantDetail>(listTenants)
);
