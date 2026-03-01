import type {Request, Response, NextFunction} from "express";
import z from "zod";
import type {TenantsResponse} from "@kamers/shared";
import {HttpException} from "../lib/http-exception.js";
import {parsePagination} from "../lib/pagination.js";
import {parseRequestObj} from "../lib/parse.js";
import type TenantService from "../services/tenant-service.js";
import {TenantError} from "../services/tenant-service.js";

const createTenantSchema = z.object({
    name: z.string().min(1),
    domains: z.array(z.string().min(1)).min(1),
    adminEmail: z.email(),
    adminName: z.string().min(1),
});

function mapTenantError(error: TenantError): HttpException {
    switch (error) {
        case TenantError.FORBIDDEN:
            return HttpException.forbidden();
        case TenantError.DB_ERROR:
            return HttpException.internal();
    }
}

class TenantController {
    constructor(private readonly tenantService: TenantService) {}

    create = async (req: Request, res: Response<TenantsResponse["create"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const parsed = await parseRequestObj(req.body, createTenantSchema);
        if (!parsed.ok) return next(parsed.ctx);

        const result = await this.tenantService.create(parsed.data, {
            actingUserId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapTenantError(result.ctx));

        res.status(201).json(result.data);
    };

    list = async (req: Request, res: Response<TenantsResponse["list"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const pagination = parsePagination(req);
        const result = await this.tenantService.list(req.auth.userId, pagination);
        if (!result.ok) return next(mapTenantError(result.ctx));

        res.json(result.data);
    };
}

export default TenantController;
