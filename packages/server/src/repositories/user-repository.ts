import {success, failure, type Result, type MaybeNull, type RawModel} from "@kamers/shared";
import type {User, UserPermission, Permission} from "../generated/prisma/index.js";
import type {SkipTake} from "../lib/pagination";
import type DataService from "../services/data-service.js";

export type UserWithPermissions = Omit<User, "passwordHash" | "inviteTokenExpiry"> & {
    userPermissions: (UserPermission & {permission: Permission})[];
};

class UserRepository {
    constructor(private readonly db: DataService) {}

    async findById(id: string): Promise<Result<MaybeNull<User>>> {
        try {
            const user = await this.db.p.user.findUnique({where: {id}});
            return success(user);
        } catch {
            return failure("failed to find user by id");
        }
    }

    async findByEmail(email: string): Promise<Result<MaybeNull<User>>> {
        try {
            const user = await this.db.p.user.findUnique({where: {email}});
            return success(user);
        } catch {
            return failure("failed to find user by email");
        }
    }

    async findByTenantId(
        tenantId: string,
        opts: Partial<SkipTake> = {}
    ): Promise<Result<{data: UserWithPermissions[]; total: number}>> {
        try {
            const [users, total] = await Promise.all([
                this.db.p.user.findMany({
                    where: {tenantId},
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        isActive: true,
                        isSuperAdmin: true,
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
                this.db.p.user.count({where: {tenantId}}),
            ]);
            return success({data: users as UserWithPermissions[], total});
        } catch {
            return failure("failed to find users by tenant");
        }
    }

    async create(data: RawModel<User>): Promise<Result<User>> {
        try {
            const user = await this.db.p.user.create({data});
            return success(user);
        } catch {
            return failure("failed to create user");
        }
    }

    async updatePassword(id: string, passwordHash: string): Promise<Result<User>> {
        try {
            const user = await this.db.p.user.update({
                where: {id},
                data: {passwordHash},
            });
            return success(user);
        } catch {
            return failure("failed to update password");
        }
    }

    async findByInviteToken(token: string): Promise<Result<MaybeNull<User>>> {
        try {
            const user = await this.db.p.user.findUnique({
                where: {inviteToken: token},
            });
            return success(user);
        } catch {
            return failure("failed to find user by invite token");
        }
    }

    async clearInviteToken(id: string): Promise<Result<User>> {
        try {
            const user = await this.db.p.user.update({
                where: {id},
                data: {inviteToken: null, inviteTokenExpiry: null},
            });
            return success(user);
        } catch {
            return failure("failed to clear invite token");
        }
    }

    async setInviteToken(id: string, token: string, expiry: Date): Promise<Result<User>> {
        try {
            const user = await this.db.p.user.update({
                where: {id},
                data: {inviteToken: token, inviteTokenExpiry: expiry},
            });
            return success(user);
        } catch {
            return failure("failed to set invite token");
        }
    }
}

export default UserRepository;
