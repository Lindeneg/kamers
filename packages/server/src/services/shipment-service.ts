import {
    success,
    failure,
    emptySuccess,
    type Result,
    type EmptyResult,
    type Shipment as APIShipment,
    type ShipmentsResponse,
    type PaginationParams,
} from "@kamers/shared";
import type {Shipment} from "../generated/prisma/index";
import {paginate, toSkipTake} from "../lib/pagination";
import type ShipmentRepository from "../repositories/shipment-repository";
import type AuditLogRepository from "../repositories/audit-log-repository";

function toAPI(s: Shipment): APIShipment {
    return {
        ...s,
        estimatedArrival: s.estimatedArrival?.toISOString() ?? null,
    };
}

interface CreateInput {
    referenceNumber: string;
    origin: string;
    destination: string;
    status?: string;
    estimatedArrival?: string | null;
}

interface UpdateInput {
    referenceNumber?: string;
    origin?: string;
    destination?: string;
    status?: string;
    estimatedArrival?: string | null;
}

interface ActionContext {
    tenantId: string;
    userId: string;
    ipAddress: string | undefined;
}

export const ShipmentError = {
    NOT_FOUND: "not_found",
    CROSS_TENANT: "cross_tenant",
    DB_ERROR: "db_error",
    DUPLICATE_REF: "duplicate_ref",
} as const;

export type ShipmentError = (typeof ShipmentError)[keyof typeof ShipmentError];

class ShipmentService {
    constructor(
        private readonly shipmentRepo: ShipmentRepository,
        private readonly auditLogRepo: AuditLogRepository
    ) {}

    async list(
        tenantId: string,
        pagination: PaginationParams
    ): Promise<Result<ShipmentsResponse["list"], ShipmentError>> {
        const result = await this.shipmentRepo.findByTenantId(tenantId, toSkipTake(pagination));
        if (!result.ok) return failure(ShipmentError.DB_ERROR);

        return success(paginate(result.data.data.map(toAPI), result.data.total, pagination));
    }

    async create(
        input: CreateInput,
        ctx: ActionContext
    ): Promise<Result<ShipmentsResponse["create"], ShipmentError>> {
        const result = await this.shipmentRepo.create({
            referenceNumber: input.referenceNumber,
            origin: input.origin,
            destination: input.destination,
            status: input.status,
            estimatedArrival: input.estimatedArrival ? new Date(input.estimatedArrival) : null,
            tenantId: ctx.tenantId,
        });

        if (!result.ok) {
            if (result.ctx === "duplicate_ref") return failure(ShipmentError.DUPLICATE_REF);
            return failure(ShipmentError.DB_ERROR);
        }

        await this.auditLogRepo.create({
            action: "create_shipment",
            entity: "shipment",
            entityId: result.data.id,
            details: JSON.stringify({
                referenceNumber: input.referenceNumber,
                origin: input.origin,
                destination: input.destination,
            }),
            userId: ctx.userId,
            tenantId: ctx.tenantId,
            ipAddress: ctx.ipAddress,
        });

        return success(toAPI(result.data));
    }

    async update(
        id: string,
        input: UpdateInput,
        ctx: ActionContext
    ): Promise<Result<ShipmentsResponse["update"], ShipmentError>> {
        const existing = await this.shipmentRepo.findById(id);
        if (!existing.ok) return failure(ShipmentError.DB_ERROR);
        if (!existing.data) return failure(ShipmentError.NOT_FOUND);
        if (existing.data.tenantId !== ctx.tenantId) return failure(ShipmentError.CROSS_TENANT);

        const result = await this.shipmentRepo.update(id, {
            referenceNumber: input.referenceNumber,
            origin: input.origin,
            destination: input.destination,
            status: input.status,
            estimatedArrival: input.estimatedArrival !== undefined
                ? (input.estimatedArrival ? new Date(input.estimatedArrival) : null)
                : undefined,
        });

        if (!result.ok) {
            if (result.ctx === "duplicate_ref") return failure(ShipmentError.DUPLICATE_REF);
            return failure(ShipmentError.DB_ERROR);
        }

        await this.auditLogRepo.create({
            action: "update_shipment",
            entity: "shipment",
            entityId: id,
            details: JSON.stringify({referenceNumber: result.data.referenceNumber}),
            userId: ctx.userId,
            tenantId: ctx.tenantId,
            ipAddress: ctx.ipAddress,
        });

        return success(toAPI(result.data));
    }

    async delete(
        id: string,
        ctx: ActionContext
    ): Promise<EmptyResult<ShipmentError>> {
        const existing = await this.shipmentRepo.findById(id);
        if (!existing.ok) return failure(ShipmentError.DB_ERROR);
        if (!existing.data) return failure(ShipmentError.NOT_FOUND);
        if (existing.data.tenantId !== ctx.tenantId) return failure(ShipmentError.CROSS_TENANT);

        const result = await this.shipmentRepo.delete(id);
        if (!result.ok) return failure(ShipmentError.DB_ERROR);

        await this.auditLogRepo.create({
            action: "delete_shipment",
            entity: "shipment",
            entityId: id,
            details: JSON.stringify({referenceNumber: existing.data.referenceNumber}),
            userId: ctx.userId,
            tenantId: ctx.tenantId,
            ipAddress: ctx.ipAddress,
        });

        return emptySuccess();
    }
}

export default ShipmentService;
