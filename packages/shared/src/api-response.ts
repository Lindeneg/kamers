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
        permissions: Permission[];
    };
};

export interface Shipment {
    id: string;
    referenceNumber: string;
    origin: string;
    destination: string;
    status: string;
    estimatedArrival: MaybeNull<string>;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateShipmentInput = Pick<Shipment, "referenceNumber" | "origin" | "destination"> & {
    status?: string;
    estimatedArrival?: MaybeNull<string>;
};

export type UpdateShipmentInput = Partial<CreateShipmentInput>;

export type ShipmentsResponse = {
    list: Paginated<Shipment>;
    create: Shipment;
    update: Shipment;
    delete: BasePayload;
};

export interface Booking {
    id: string;
    shipmentId: string;
    customerName: string;
    customerEmail: string;
    status: string;
    bookedAt: Date;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateBookingInput = Pick<Booking, "shipmentId" | "customerName" | "customerEmail"> & {
    status?: string;
};

export type UpdateBookingInput = Partial<Omit<CreateBookingInput, "shipmentId">>;

export type BookingsResponse = {
    list: Paginated<Booking>;
    create: Booking;
    update: Booking;
    delete: BasePayload;
};

export interface Container {
    id: string;
    shipmentId: string;
    containerNumber: string;
    type: string;
    status: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateContainerInput = Pick<Container, "shipmentId" | "containerNumber" | "type"> & {
    status?: string;
};

export type UpdateContainerInput = Partial<Omit<CreateContainerInput, "shipmentId">>;

export type ContainersResponse = {
    list: Paginated<Container>;
    create: Container;
    update: Container;
    delete: BasePayload;
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
    bookings: BookingsResponse;
    containers: ContainersResponse;
    tenants: TenantsResponse;
    users: UsersResponse;
    auditLogs: AuditLogsResponse;
};
