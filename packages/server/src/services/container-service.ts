import {
    success,
    failure,
    emptySuccess,
    type Result,
    type EmptyResult,
    type ContainersResponse,
    type PaginationParams,
} from "@kamers/shared";
import {paginate, toSkipTake} from "../lib/pagination";
import type ContainerRepository from "../repositories/container-repository";
import type ShipmentRepository from "../repositories/shipment-repository";
import type AuditLogRepository from "../repositories/audit-log-repository";

interface CreateInput {
    shipmentId: string;
    containerNumber: string;
    type: string;
    status?: string;
}

interface UpdateInput {
    containerNumber?: string;
    type?: string;
    status?: string;
}

interface ActionContext {
    tenantId: string;
    userId: string;
    ipAddress: string | undefined;
}

export const ContainerError = {
    NOT_FOUND: "not_found",
    CROSS_TENANT: "cross_tenant",
    SHIPMENT_NOT_FOUND: "shipment_not_found",
    DB_ERROR: "db_error",
} as const;

export type ContainerError = (typeof ContainerError)[keyof typeof ContainerError];

class ContainerService {
    constructor(
        private readonly containerRepo: ContainerRepository,
        private readonly shipmentRepo: ShipmentRepository,
        private readonly auditLogRepo: AuditLogRepository
    ) {}

    async list(
        tenantId: string,
        pagination: PaginationParams
    ): Promise<Result<ContainersResponse["list"], ContainerError>> {
        const result = await this.containerRepo.findByTenantId(tenantId, toSkipTake(pagination));
        if (!result.ok) return failure(ContainerError.DB_ERROR);

        return success(paginate(result.data.data, result.data.total, pagination));
    }

    async create(
        input: CreateInput,
        ctx: ActionContext
    ): Promise<Result<ContainersResponse["create"], ContainerError>> {
        const shipment = await this.shipmentRepo.findById(input.shipmentId);
        if (!shipment.ok) return failure(ContainerError.DB_ERROR);
        if (!shipment.data) return failure(ContainerError.SHIPMENT_NOT_FOUND);
        if (shipment.data.tenantId !== ctx.tenantId) return failure(ContainerError.CROSS_TENANT);

        const result = await this.containerRepo.create({
            shipmentId: input.shipmentId,
            containerNumber: input.containerNumber,
            type: input.type,
            status: input.status,
            tenantId: ctx.tenantId,
        });

        if (!result.ok) return failure(ContainerError.DB_ERROR);

        await this.auditLogRepo.create({
            action: "create_container",
            entity: "container",
            entityId: result.data.id,
            details: JSON.stringify({
                containerNumber: input.containerNumber,
                type: input.type,
                shipmentId: input.shipmentId,
            }),
            userId: ctx.userId,
            tenantId: ctx.tenantId,
            ipAddress: ctx.ipAddress,
        });

        return success(result.data);
    }

    async update(
        id: string,
        input: UpdateInput,
        ctx: ActionContext
    ): Promise<Result<ContainersResponse["update"], ContainerError>> {
        const existing = await this.containerRepo.findById(id);
        if (!existing.ok) return failure(ContainerError.DB_ERROR);
        if (!existing.data) return failure(ContainerError.NOT_FOUND);
        if (existing.data.tenantId !== ctx.tenantId) return failure(ContainerError.CROSS_TENANT);

        const result = await this.containerRepo.update(id, {
            containerNumber: input.containerNumber,
            type: input.type,
            status: input.status,
        });

        if (!result.ok) return failure(ContainerError.DB_ERROR);

        await this.auditLogRepo.create({
            action: "update_container",
            entity: "container",
            entityId: id,
            details: JSON.stringify({containerNumber: result.data.containerNumber}),
            userId: ctx.userId,
            tenantId: ctx.tenantId,
            ipAddress: ctx.ipAddress,
        });

        return success(result.data);
    }

    async delete(
        id: string,
        ctx: ActionContext
    ): Promise<EmptyResult<ContainerError>> {
        const existing = await this.containerRepo.findById(id);
        if (!existing.ok) return failure(ContainerError.DB_ERROR);
        if (!existing.data) return failure(ContainerError.NOT_FOUND);
        if (existing.data.tenantId !== ctx.tenantId) return failure(ContainerError.CROSS_TENANT);

        const result = await this.containerRepo.delete(id);
        if (!result.ok) return failure(ContainerError.DB_ERROR);

        await this.auditLogRepo.create({
            action: "delete_container",
            entity: "container",
            entityId: id,
            details: JSON.stringify({containerNumber: existing.data.containerNumber}),
            userId: ctx.userId,
            tenantId: ctx.tenantId,
            ipAddress: ctx.ipAddress,
        });

        return emptySuccess();
    }
}

export default ContainerService;
