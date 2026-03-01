import {success, failure, type Result} from "@kamers/shared";
import type {Permission} from "../generated/prisma/index";
import type DataService from "../services/data-service";
import type LoggerService from "../services/logger-service";

class PermissionRepository {
    constructor(
        private readonly db: DataService,
        private readonly log: LoggerService
    ) {}

    async findBySlugs(slugs: string[]): Promise<Result<Permission[]>> {
        try {
            const permissions = await this.db.p.permission.findMany({
                where: {slug: {in: slugs}},
            });
            return success(permissions);
        } catch (err) {
            this.log.error(err, "failed to find permissions by slugs");
            return failure("failed to find permissions by slugs");
        }
    }
}

export default PermissionRepository;
