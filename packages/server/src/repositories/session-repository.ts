import {
    success,
    emptySuccess,
    failure,
    type Result,
    type MaybeNull,
    type EmptyResult,
    type RawModel,
} from "@kamers/shared";
import type {Session, User} from "../generated/prisma/index";
import type DataService from "../services/data-service";
import type LoggerService from "../services/logger-service";

type SessionWithUser = Session & {user: User};

class SessionRepository {
    constructor(
        private readonly db: DataService,
        private readonly log: LoggerService
    ) {}

    async create(data: RawModel<Session>): Promise<Result<Session>> {
        try {
            const session = await this.db.p.session.create({data});
            return success(session);
        } catch (err) {
            this.log.error(err, "failed to create session");
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
        } catch (err) {
            this.log.error(err, "failed to find session by id");
            return failure("failed to find session by id");
        }
    }

    async deleteById(id: string): Promise<EmptyResult> {
        try {
            await this.db.p.session.delete({where: {id}});
            return emptySuccess();
        } catch (err) {
            this.log.error(err, "failed to delete session");
            return failure("failed to delete session");
        }
    }

}

export default SessionRepository;
