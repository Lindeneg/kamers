import {
    success,
    failure,
    emptySuccess,
    type Result,
    type EmptyResult,
    type BookingsResponse,
    type PaginationParams,
} from "@kamers/shared";
import {paginate, toSkipTake} from "../lib/pagination";
import type BookingRepository from "../repositories/booking-repository";
import type ShipmentRepository from "../repositories/shipment-repository";
import type AuditLogRepository from "../repositories/audit-log-repository";

interface CreateInput {
    shipmentId: string;
    customerName: string;
    customerEmail: string;
    status?: string;
}

interface UpdateInput {
    customerName?: string;
    customerEmail?: string;
    status?: string;
}

interface ActionContext {
    tenantId: string;
    userId: string;
    ipAddress: string | undefined;
}

export const BookingError = {
    NOT_FOUND: "not_found",
    CROSS_TENANT: "cross_tenant",
    SHIPMENT_NOT_FOUND: "shipment_not_found",
    DB_ERROR: "db_error",
} as const;

export type BookingError = (typeof BookingError)[keyof typeof BookingError];

class BookingService {
    constructor(
        private readonly bookingRepo: BookingRepository,
        private readonly shipmentRepo: ShipmentRepository,
        private readonly auditLogRepo: AuditLogRepository
    ) {}

    async list(
        tenantId: string,
        pagination: PaginationParams
    ): Promise<Result<BookingsResponse["list"], BookingError>> {
        const result = await this.bookingRepo.findByTenantId(tenantId, toSkipTake(pagination));
        if (!result.ok) return failure(BookingError.DB_ERROR);

        return success(paginate(result.data.data, result.data.total, pagination));
    }

    async create(
        input: CreateInput,
        ctx: ActionContext
    ): Promise<Result<BookingsResponse["create"], BookingError>> {
        const shipment = await this.shipmentRepo.findById(input.shipmentId);
        if (!shipment.ok) return failure(BookingError.DB_ERROR);
        if (!shipment.data) return failure(BookingError.SHIPMENT_NOT_FOUND);
        if (shipment.data.tenantId !== ctx.tenantId) return failure(BookingError.CROSS_TENANT);

        const result = await this.bookingRepo.create({
            shipmentId: input.shipmentId,
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            status: input.status,
            tenantId: ctx.tenantId,
        });

        if (!result.ok) return failure(BookingError.DB_ERROR);

        await this.auditLogRepo.create({
            action: "create_booking",
            entity: "booking",
            entityId: result.data.id,
            details: JSON.stringify({
                customerName: input.customerName,
                customerEmail: input.customerEmail,
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
    ): Promise<Result<BookingsResponse["update"], BookingError>> {
        const existing = await this.bookingRepo.findById(id);
        if (!existing.ok) return failure(BookingError.DB_ERROR);
        if (!existing.data) return failure(BookingError.NOT_FOUND);
        if (existing.data.tenantId !== ctx.tenantId) return failure(BookingError.CROSS_TENANT);

        const result = await this.bookingRepo.update(id, {
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            status: input.status,
        });

        if (!result.ok) return failure(BookingError.DB_ERROR);

        await this.auditLogRepo.create({
            action: "update_booking",
            entity: "booking",
            entityId: id,
            details: JSON.stringify({customerName: result.data.customerName}),
            userId: ctx.userId,
            tenantId: ctx.tenantId,
            ipAddress: ctx.ipAddress,
        });

        return success(result.data);
    }

    async delete(
        id: string,
        ctx: ActionContext
    ): Promise<EmptyResult<BookingError>> {
        const existing = await this.bookingRepo.findById(id);
        if (!existing.ok) return failure(BookingError.DB_ERROR);
        if (!existing.data) return failure(BookingError.NOT_FOUND);
        if (existing.data.tenantId !== ctx.tenantId) return failure(BookingError.CROSS_TENANT);

        const result = await this.bookingRepo.delete(id);
        if (!result.ok) return failure(BookingError.DB_ERROR);

        await this.auditLogRepo.create({
            action: "delete_booking",
            entity: "booking",
            entityId: id,
            details: JSON.stringify({customerName: existing.data.customerName}),
            userId: ctx.userId,
            tenantId: ctx.tenantId,
            ipAddress: ctx.ipAddress,
        });

        return emptySuccess();
    }
}

export default BookingService;
