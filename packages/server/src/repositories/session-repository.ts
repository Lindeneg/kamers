import {
    success,
    emptySuccess,
    failure,
    type Result,
    type MaybeNull,
    type EmptyResult,
    type RawModel,
} from "@kamers/shared";
import type {Session, User} from "../generated/prisma/index.js";
import type DataService from "../services/data-service.js";

type SessionWithUser = Session & {user: User};

class SessionRepository {
    constructor(private readonly db: DataService) {}

    async create(data: RawModel<Session>): Promise<Result<Session>> {
        try {
            const session = await this.db.p.session.create({data});
            return success(session);
        } catch {
            return failure("failed to create session");
        }
    }

    async findById(id: string): Promise<Result<MaybeNull<SessionWithUser>>> {
        try {
            const session = await this.db.p.session.findUnique({
                where: {id},
                include: {user: true},
            });
            return success(session);
        } catch {
            return failure("failed to find session by id");
        }
    }

    async findByRefreshToken(refreshToken: string): Promise<Result<MaybeNull<SessionWithUser>>> {
        try {
            const session = await this.db.p.session.findUnique({
                where: {refreshToken},
                include: {user: true},
            });
            return success(session);
        } catch {
            return failure("failed to find session by refresh token");
        }
    }

    async deleteById(id: string): Promise<EmptyResult> {
        try {
            await this.db.p.session.delete({where: {id}});
            return emptySuccess();
        } catch {
            return failure("failed to delete session");
        }
    }

    async deleteByUserId(userId: string): Promise<EmptyResult> {
        try {
            await this.db.p.session.deleteMany({where: {userId}});
            return emptySuccess();
        } catch {
            return failure("failed to delete sessions by user");
        }
    }

    async deleteExpired(): Promise<Result<number>> {
        try {
            const result = await this.db.p.session.deleteMany({
                where: {expiresAt: {lt: new Date()}},
            });
            return success(result.count);
        } catch {
            return failure("failed to delete expired sessions");
        }
    }
}

export default SessionRepository;
