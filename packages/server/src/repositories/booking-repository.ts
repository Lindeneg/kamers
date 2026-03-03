import {success, failure, type Result, type MaybeNull} from "@kamers/shared";
import type {Booking} from "../generated/prisma/index";
import type {SkipTake, PaginatedResult} from "../lib/pagination";
import type DataService from "../services/data-service";
import type LoggerService from "../services/logger-service";

class BookingRepository {
    constructor(
        private readonly db: DataService,
        private readonly log: LoggerService
    ) {}

    async findById(id: string): Promise<Result<MaybeNull<Booking>>> {
        try {
            const booking = await this.db.p.booking.findUnique({where: {id}});
            return success(booking);
        } catch (err) {
            this.log.error(err, "failed to find booking by id");
            return failure("failed to find booking by id");
        }
    }

    async findByTenantId(
        tenantId: string,
        opts: Partial<SkipTake> = {}
    ): Promise<Result<PaginatedResult<Booking>>> {
        try {
            const where = {tenantId};
            const [data, total] = await Promise.all([
                this.db.p.booking.findMany({
                    where,
                    orderBy: {createdAt: "desc"},
                    skip: opts.skip,
                    take: opts.take,
                }),
                this.db.p.booking.count({where}),
            ]);
            return success({data, total});
        } catch (err) {
            this.log.error(err, "failed to find bookings by tenant");
            return failure("failed to find bookings by tenant");
        }
    }

    async create(data: {
        shipmentId: string;
        customerName: string;
        customerEmail: string;
        status?: string;
        tenantId: string;
    }): Promise<Result<Booking>> {
        try {
            const booking = await this.db.p.booking.create({data});
            return success(booking);
        } catch (err) {
            this.log.error(err, "failed to create booking");
            return failure("failed to create booking");
        }
    }

    async update(
        id: string,
        data: Partial<{
            customerName: string;
            customerEmail: string;
            status: string;
        }>
    ): Promise<Result<Booking>> {
        try {
            const booking = await this.db.p.booking.update({where: {id}, data});
            return success(booking);
        } catch (err) {
            this.log.error(err, "failed to update booking");
            return failure("failed to update booking");
        }
    }

    async delete(id: string): Promise<Result<void>> {
        try {
            await this.db.p.booking.delete({where: {id}});
            return success(undefined);
        } catch (err) {
            this.log.error(err, "failed to delete booking");
            return failure("failed to delete booking");
        }
    }
}

export default BookingRepository;
