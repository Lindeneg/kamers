import {success, failure, type Result} from "@kamers/shared";
import type {Permission} from "../generated/prisma/index.js";
import type DataService from "../services/data-service.js";

class PermissionRepository {
    constructor(private readonly db: DataService) {}

    async findAll(): Promise<Result<Permission[]>> {
        try {
            const permissions = await this.db.p.permission.findMany();
            return success(permissions);
        } catch {
            return failure("failed to find permissions");
        }
    }

    async findBySlug(slug: string): Promise<Result<Permission>> {
        try {
            const permission = await this.db.p.permission.findUnique({
                where: {slug},
            });
            if (permission) return success(permission);
        } catch {}
        return failure("failed to find permission by slug");
    }

    async findBySlugs(slugs: string[]): Promise<Result<Permission[]>> {
        try {
            const permissions = await this.db.p.permission.findMany({
                where: {slug: {in: slugs}},
            });
            return success(permissions);
        } catch {
            return failure("failed to find permissions by slugs");
        }
    }
}

export default PermissionRepository;
