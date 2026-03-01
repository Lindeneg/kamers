import {success, failure, emptySuccess, type Result, type EmptyResult, type Permission as PermissionSlug} from "@kamers/shared";
import type DataService from "../services/data-service";
import type LoggerService from "../services/logger-service";

class UserPermissionRepository {
    constructor(
        private readonly db: DataService,
        private readonly log: LoggerService
    ) {}

    async getPermissionsForUser(userId: string): Promise<Result<PermissionSlug[]>> {
        try {
            const userPermissions = await this.db.p.userPermission.findMany({
                where: {userId},
                include: {permission: true},
            });
            const slugs = userPermissions.map((up) => up.permission.slug) as PermissionSlug[];
            return success(slugs);
        } catch (err) {
            this.log.error(err, "failed to get permissions for user");
            return failure("failed to get permissions for user");
        }
    }

    async setPermissions(userId: string, slugs: string[]): Promise<EmptyResult> {
        try {
            const permissions = await this.db.p.permission.findMany({
                where: {slug: {in: slugs}},
            });

            await this.db.p.$transaction([
                this.db.p.userPermission.deleteMany({where: {userId}}),
                ...permissions.map((p) =>
                    this.db.p.userPermission.create({data: {userId, permissionId: p.id}})
                ),
            ]);

            return emptySuccess();
        } catch (err) {
            this.log.error(err, "failed to set user permissions");
            return failure("failed to set user permissions");
        }
    }
}

export default UserPermissionRepository;
