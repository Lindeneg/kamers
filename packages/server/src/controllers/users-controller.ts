import type {Request, Response, NextFunction} from "express";
import z from "zod";
import type {UsersResponse} from "@kamers/shared";
import {HttpException} from "../lib/http-exception";
import {parsePagination} from "../lib/pagination";
import {parseRequestObj} from "../lib/parse";
import type UserService from "../services/user-service";
import {UserError} from "../services/user-service";

const inviteSchema = z.object({
    email: z.email(),
    name: z.string().min(1),
});

const updatePermissionsSchema = z.object({
    permissions: z.array(z.string().min(1)),
});

const toggleActiveSchema = z.object({
    isActive: z.boolean(),
});

function mapUserError(error: UserError): HttpException {
    switch (error) {
        case UserError.EMAIL_TAKEN:
            return HttpException.unprocessable(undefined, "A user with this email already exists");
        case UserError.USER_NOT_FOUND:
            return HttpException.notFound();
        case UserError.CROSS_TENANT:
            return HttpException.forbidden();
        case UserError.CANNOT_MODIFY_TENANT_ADMIN:
            return HttpException.forbidden(undefined, "Cannot modify tenant admin permissions");
        case UserError.CANNOT_DELETE_ADMIN:
            return HttpException.forbidden(undefined, "Cannot delete tenant admin");
        case UserError.CANNOT_MODIFY_SELF:
            return HttpException.forbidden(undefined, "Cannot modify your own permissions");
        case UserError.NOT_TENANT_ADMIN:
            return HttpException.forbidden(undefined, "Only the tenant admin can transfer ownership");
        case UserError.DB_ERROR:
            return HttpException.internal();
    }
}

class UsersController {
    constructor(private readonly userService: UserService) {}

    list = async (req: Request, res: Response<UsersResponse["list"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const pagination = parsePagination(req);
        const queryTenantId = req.query.tenantId as string | undefined;
        const result = await this.userService.listByTenant(
            req.auth.tenantId,
            queryTenantId,
            req.auth.userId,
            pagination
        );
        if (!result.ok) return next(mapUserError(result.ctx));

        res.json(result.data);
    };

    invite = async (req: Request, res: Response<UsersResponse["invite"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const parsed = await parseRequestObj(req.body, inviteSchema);
        if (!parsed.ok) return next(parsed.ctx);

        const result = await this.userService.invite(parsed.data, {
            tenantId: req.auth.tenantId,
            userId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapUserError(result.ctx));

        res.status(201).json(result.data);
    };

    updatePermissions = async (req: Request, res: Response<UsersResponse["updatePermissions"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const userId = req.params.userId as string;
        if (!userId) return next(HttpException.malformedBody());

        const parsed = await parseRequestObj(req.body, updatePermissionsSchema);
        if (!parsed.ok) return next(parsed.ctx);

        const result = await this.userService.updatePermissions(
            {userId, permissions: parsed.data.permissions},
            {
                tenantId: req.auth.tenantId,
                actingUserId: req.auth.userId,
                ipAddress: req.ip,
            }
        );
        if (!result.ok) return next(mapUserError(result.ctx));

        res.json({msg: "permissions updated"});
    };

    transferOwnership = async (req: Request, res: Response<UsersResponse["transferOwnership"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const userId = req.params.userId as string;
        if (!userId) return next(HttpException.malformedBody());

        const result = await this.userService.transferOwnership(userId, {
            tenantId: req.auth.tenantId,
            actingUserId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapUserError(result.ctx));

        res.json({msg: "ownership transferred"});
    };

    toggleActive = async (req: Request, res: Response<UsersResponse["toggleActive"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const userId = req.params.userId as string;
        if (!userId) return next(HttpException.malformedBody());

        const parsed = await parseRequestObj(req.body, toggleActiveSchema);
        if (!parsed.ok) return next(parsed.ctx);

        const result = await this.userService.toggleActive(userId, parsed.data.isActive, {
            tenantId: req.auth.tenantId,
            actingUserId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapUserError(result.ctx));

        res.json({msg: parsed.data.isActive ? "user activated" : "user deactivated"});
    };

    deleteUser = async (req: Request, res: Response<UsersResponse["deleteUser"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const userId = req.params.userId as string;
        if (!userId) return next(HttpException.malformedBody());

        const result = await this.userService.softDelete(userId, {
            tenantId: req.auth.tenantId,
            actingUserId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapUserError(result.ctx));

        res.json({msg: "user deleted"});
    };
}

export default UsersController;
