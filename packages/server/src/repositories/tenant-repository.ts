import {success, failure, type Result, type MaybeNull} from "@kamers/shared";
import type {Tenant, TenantDomain} from "../generated/prisma/index";
import type {SkipTake, PaginatedResult} from "../lib/pagination";
import type DataService from "../services/data-service";
import type LoggerService from "../services/logger-service";

type TenantWithDomains = Tenant & {domains: TenantDomain[]};

class TenantRepository {
    constructor(
        private readonly db: DataService,
        private readonly log: LoggerService
    ) {}

    async findById(id: string): Promise<Result<MaybeNull<TenantWithDomains>>> {
        try {
            const tenant = await this.db.p.tenant.findUnique({
                where: {id},
                include: {domains: true},
            });
            return success(tenant);
        } catch (err) {
            this.log.error(err, "failed to find tenant by id");
            return failure("failed to find tenant by id");
        }
    }

    async findByDomain(domain: string): Promise<Result<MaybeNull<TenantWithDomains>>> {
        try {
            const tenant = await this.db.p.tenant.findFirst({
                where: {domains: {some: {domain}}},
                include: {domains: true},
            });
            return success(tenant);
        } catch (err) {
            this.log.error(err, "failed to find tenant by domain");
            return failure("failed to find tenant by domain");
        }
    }

    async create(data: {name: string; domains: string[]}): Promise<Result<TenantWithDomains>> {
        try {
            const tenant = await this.db.p.tenant.create({
                data: {
                    name: data.name,
                    domains: {
                        create: data.domains.map((domain) => ({domain})),
                    },
                },
                include: {domains: true},
            });
            return success(tenant);
        } catch (err) {
            this.log.error(err, "failed to create tenant");
            return failure("failed to create tenant");
        }
    }

    async findAll(
        opts: Partial<SkipTake> = {}
    ): Promise<Result<PaginatedResult<TenantWithDomains>>> {
        try {
            const [tenants, total] = await Promise.all([
                this.db.p.tenant.findMany({
                    include: {domains: true},
                    skip: opts.skip,
                    take: opts.take,
                }),
                this.db.p.tenant.count(),
            ]);
            return success({data: tenants, total});
        } catch (err) {
            this.log.error(err, "failed to find tenants");
            return failure("failed to find tenants");
        }
    }
}

export default TenantRepository;
