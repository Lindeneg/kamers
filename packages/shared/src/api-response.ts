import type {Permission} from "./permissions.js";
import type {Paginated} from "./pagination.js";
import type {MaybeNull} from "./types.js";

type BasePayload = {
    msg: string;
};

export type AuthResponse = {
    login: BasePayload;
    logout: BasePayload;
    refresh: BasePayload;
    setPassword: BasePayload;
    me: {
        id: string;
        email: string;
        name: string;
        tenantId: string;
        isSuperAdmin: boolean;
        pictureUrl: MaybeNull<string>;
        permissions: Permission[];
    };
    oauthProviders: {
        providers: string[];
    };
};

export interface Shipment {
    id: string;
    origin: string;
    destination: string;
    status: string;
    tenantId: string;
}

export type ShipmentsResponse = {
    list: Paginated<Shipment>;
    getById: Shipment;
    create: Shipment;
};

export interface TenantDomain {
    id: string;
    domain: string;
    tenantId: string;
}

export interface TenantDetail {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    domains: TenantDomain[];
}

export type TenantsResponse = {
    list: Paginated<TenantDetail>;
    create: {
        tenant: TenantDetail;
        adminUser: {
            id: string;
            email: string;
        };
    };
    delete: BasePayload;
};

export interface UserDetail {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    isDeleted: boolean;
    isSuperAdmin: boolean;
    isTenantAdmin: boolean;
    tenantId: string;
    hasPendingInvite: boolean;
    permissions: Permission[];
    createdAt: Date;
    updatedAt: Date;
}

export type UsersResponse = {
    list: Paginated<UserDetail>;
    invite: {
        id: string;
        email: string;
    };
    updatePermissions: BasePayload;
    transferOwnership: BasePayload;
    toggleActive: BasePayload;
    deleteUser: BasePayload;
};

export interface AuditLogEntry {
    id: string;
    action: string;
    entity: string;
    tenantId: string;
    createdAt: Date;
    entityId: MaybeNull<string>;
    userId: MaybeNull<string>;
    details: MaybeNull<string>;
    ipAddress: MaybeNull<string>;
    user: MaybeNull<{id: string; email: string; name: string}>;
}

export type AuditLogsResponse = {
    list: Paginated<AuditLogEntry>;
};

export type APIPayload = {
    auth: AuthResponse;
    shipments: ShipmentsResponse;
    tenants: TenantsResponse;
    users: UsersResponse;
    auditLogs: AuditLogsResponse;
};
