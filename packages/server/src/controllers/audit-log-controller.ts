import type {Request, Response, NextFunction} from "express";
import type {AuditLogsResponse} from "@kamers/shared";
import {HttpException} from "../lib/http-exception";
import {parsePagination} from "../lib/pagination";
import type AuditLogService from "../services/audit-log-service";
import {AuditLogError} from "../services/audit-log-service";

function mapAuditLogError(req: Request, error: AuditLogError): HttpException {
    req.log.error(error);
    switch (error) {
        case AuditLogError.FORBIDDEN:
            return HttpException.forbidden();
        case AuditLogError.DB_ERROR:
            return HttpException.internal();
    }
}

class AuditLogController {
    constructor(private readonly auditLogService: AuditLogService) {}

    list = async (req: Request, res: Response<AuditLogsResponse["list"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const pagination = parsePagination(req);
        const queryTenantId = req.query.tenantId as string | undefined;

        const result = await this.auditLogService.listByTenant(
            req.auth.tenantId,
            queryTenantId,
            req.auth.userId,
            pagination
        );
        if (!result.ok) return next(mapAuditLogError(req, result.ctx));

        res.json(result.data);
    };
}

export default AuditLogController;
