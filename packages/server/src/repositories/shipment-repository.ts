import {success, failure, type Result, type MaybeNull} from "@kamers/shared";
import type {Shipment} from "../generated/prisma/index";
import type {SkipTake, PaginatedResult} from "../lib/pagination";
import type DataService from "../services/data-service";
import type LoggerService from "../services/logger-service";

class ShipmentRepository {
    constructor(
        private readonly db: DataService,
        private readonly log: LoggerService
    ) {}

    async findById(id: string): Promise<Result<MaybeNull<Shipment>>> {
        try {
            const shipment = await this.db.p.shipment.findUnique({where: {id}});
            return success(shipment);
        } catch (err) {
            this.log.error(err, "failed to find shipment by id");
            return failure("failed to find shipment by id");
        }
    }

    async findByTenantId(
        tenantId: string,
        opts: Partial<SkipTake> = {}
    ): Promise<Result<PaginatedResult<Shipment>>> {
        try {
            const where = {tenantId};
            const [data, total] = await Promise.all([
                this.db.p.shipment.findMany({
                    where,
                    orderBy: {createdAt: "desc"},
                    skip: opts.skip,
                    take: opts.take,
                }),
                this.db.p.shipment.count({where}),
            ]);
            return success({data, total});
        } catch (err) {
            this.log.error(err, "failed to find shipments by tenant");
            return failure("failed to find shipments by tenant");
        }
    }

    async create(data: {
        referenceNumber: string;
        origin: string;
        destination: string;
        status?: string;
        estimatedArrival?: Date | null;
        tenantId: string;
    }): Promise<Result<Shipment>> {
        try {
            const shipment = await this.db.p.shipment.create({data});
            return success(shipment);
        } catch (err: any) {
            if (err?.code === "P2002") {
                return failure("duplicate_ref");
            }
            this.log.error(err, "failed to create shipment");
            return failure("failed to create shipment");
        }
    }

    async update(
        id: string,
        data: Partial<{
            referenceNumber: string;
            origin: string;
            destination: string;
            status: string;
            estimatedArrival: Date | null;
        }>
    ): Promise<Result<Shipment>> {
        try {
            const shipment = await this.db.p.shipment.update({where: {id}, data});
            return success(shipment);
        } catch (err: any) {
            if (err?.code === "P2002") {
                return failure("duplicate_ref");
            }
            this.log.error(err, "failed to update shipment");
            return failure("failed to update shipment");
        }
    }

    async delete(id: string): Promise<Result<void>> {
        try {
            await this.db.p.shipment.delete({where: {id}});
            return success(undefined);
        } catch (err) {
            this.log.error(err, "failed to delete shipment");
            return failure("failed to delete shipment");
        }
    }
}

export default ShipmentRepository;
