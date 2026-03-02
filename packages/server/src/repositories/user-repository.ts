import {success, failure, type Result, type MaybeNull} from "@kamers/shared";
import type {User, UserPermission, Permission} from "../generated/prisma/index";
import type {SkipTake, PaginatedResult} from "../lib/pagination";
import type DataService from "../services/data-service";
import type LoggerService from "../services/logger-service";

export type UserWithPermissions = Omit<User, "passwordHash" | "inviteTokenExpiry"> & {
    userPermissions: (UserPermission & {permission: Permission})[];
};

class UserRepository {
    constructor(
        private readonly db: DataService,
        private readonly log: LoggerService
    ) {}

    async findById(id: string): Promise<Result<MaybeNull<User>>> {
        try {
            const user = await this.db.p.user.findUnique({where: {id}});
            return success(user);
        } catch (err) {
            this.log.error(err, "failed to find user by id");
            return failure("failed to find user by id");
        }
    }

    async findByEmail(email: string): Promise<Result<MaybeNull<User>>> {
        try {
            const user = await this.db.p.user.findFirst({where: {email, deletedAt: null}});
            return success(user);
        } catch (err) {
            this.log.error(err, "failed to find user by email");
            return failure("failed to find user by email");
        }
    }

    async findByTenantId(
        tenantId: string,
        opts: Partial<SkipTake> = {}
    ): Promise<Result<PaginatedResult<UserWithPermissions>>> {
        try {
            const where = {tenantId, deletedAt: null};
            const [users, total] = await Promise.all([
                this.db.p.user.findMany({
                    where,
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        isActive: true,
                        deletedAt: true,
                        isSuperAdmin: true,
                        isTenantAdmin: true,
                        tenantId: true,
                        inviteToken: true,
                        createdAt: true,
                        updatedAt: true,
                        userPermissions: {
                            include: {permission: true},
                        },
                    },
                    skip: opts.skip,
                    take: opts.take,
                }),
                this.db.p.user.count({where}),
            ]);
            return success({data: users as UserWithPermissions[], total});
        } catch (err) {
            this.log.error(err, "failed to find users by tenant");
            return failure("failed to find users by tenant");
        }
    }

    async findByInviteToken(token: string): Promise<Result<MaybeNull<User>>> {
        try {
            const user = await this.db.p.user.findUnique({
                where: {inviteToken: token},
            });
            return success(user);
        } catch (err) {
            this.log.error(err, "failed to find user by invite token");
            return failure("failed to find user by invite token");
        }
    }

}

export default UserRepository;
