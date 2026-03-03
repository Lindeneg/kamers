import {success, failure, type Result, type MaybeNull} from "@kamers/shared";
import type {Container} from "../generated/prisma/index";
import type {SkipTake, PaginatedResult} from "../lib/pagination";
import type DataService from "../services/data-service";
import type LoggerService from "../services/logger-service";

class ContainerRepository {
    constructor(
        private readonly db: DataService,
        private readonly log: LoggerService
    ) {}

    async findById(id: string): Promise<Result<MaybeNull<Container>>> {
        try {
            const container = await this.db.p.container.findUnique({where: {id}});
            return success(container);
        } catch (err) {
            this.log.error(err, "failed to find container by id");
            return failure("failed to find container by id");
        }
    }

    async findByTenantId(
        tenantId: string,
        opts: Partial<SkipTake> = {}
    ): Promise<Result<PaginatedResult<Container>>> {
        try {
            const where = {tenantId};
            const [data, total] = await Promise.all([
                this.db.p.container.findMany({
                    where,
                    orderBy: {createdAt: "desc"},
                    skip: opts.skip,
                    take: opts.take,
                }),
                this.db.p.container.count({where}),
            ]);
            return success({data, total});
        } catch (err) {
            this.log.error(err, "failed to find containers by tenant");
            return failure("failed to find containers by tenant");
        }
    }

    async create(data: {
        shipmentId: string;
        containerNumber: string;
        type: string;
        status?: string;
        tenantId: string;
    }): Promise<Result<Container>> {
        try {
            const container = await this.db.p.container.create({data});
            return success(container);
        } catch (err) {
            this.log.error(err, "failed to create container");
            return failure("failed to create container");
        }
    }

    async update(
        id: string,
        data: Partial<{
            containerNumber: string;
            type: string;
            status: string;
        }>
    ): Promise<Result<Container>> {
        try {
            const container = await this.db.p.container.update({where: {id}, data});
            return success(container);
        } catch (err) {
            this.log.error(err, "failed to update container");
            return failure("failed to update container");
        }
    }

    async delete(id: string): Promise<Result<void>> {
        try {
            await this.db.p.container.delete({where: {id}});
            return success(undefined);
        } catch (err) {
            this.log.error(err, "failed to delete container");
            return failure("failed to delete container");
        }
    }
}

export default ContainerRepository;
