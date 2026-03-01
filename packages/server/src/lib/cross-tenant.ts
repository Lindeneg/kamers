import {success, failure, type Result} from "@kamers/shared";
import type UserRepository from "../repositories/user-repository";

export async function resolveTenantId<TError>(
    userRepo: UserRepository,
    actingUserId: string,
    ownTenantId: string,
    queryTenantId: string | undefined,
    errors: {dbError: TError; forbidden: TError}
): Promise<Result<string, TError>> {
    const targetId = queryTenantId ?? ownTenantId;
    if (targetId === ownTenantId) return success(targetId);

    const userResult = await userRepo.findById(actingUserId);
    if (!userResult.ok) return failure(errors.dbError);
    if (!userResult.data?.isSuperAdmin) return failure(errors.forbidden);

    return success(targetId);
}
