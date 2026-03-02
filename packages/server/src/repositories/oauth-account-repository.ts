import {success, failure, type Result, type MaybeNull} from "@kamers/shared";
import type {OAuthAccount, User} from "../generated/prisma/index";
import type DataService from "../services/data-service";
import type LoggerService from "../services/logger-service";

type OAuthAccountWithUser = OAuthAccount & {user: User};

class OAuthAccountRepository {
    constructor(
        private readonly db: DataService,
        private readonly log: LoggerService
    ) {}

    async findByProviderAccount(
        provider: string,
        providerAccountId: string
    ): Promise<Result<MaybeNull<OAuthAccountWithUser>>> {
        try {
            const account = await this.db.p.oAuthAccount.findUnique({
                where: {provider_providerAccountId: {provider, providerAccountId}},
                include: {user: true},
            });
            return success(account);
        } catch (err) {
            this.log.error(err, "failed to find oauth account");
            return failure("failed to find oauth account");
        }
    }

    async create(data: {
        provider: string;
        providerAccountId: string;
        userId: string;
    }): Promise<Result<OAuthAccount>> {
        try {
            const account = await this.db.p.oAuthAccount.create({data});
            return success(account);
        } catch (err) {
            this.log.error(err, "failed to create oauth account");
            return failure("failed to create oauth account");
        }
    }
}

export default OAuthAccountRepository;
