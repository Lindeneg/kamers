import type {Request, Response, NextFunction} from "express";
import z from "zod";
import type {ContainersResponse} from "@kamers/shared";
import {HttpException} from "../lib/http-exception";
import {parsePagination} from "../lib/pagination";
import {parseRequestObj} from "../lib/parse";
import type ContainerService from "../services/container-service";
import {ContainerError} from "../services/container-service";

const createContainerSchema = z.object({
    shipmentId: z.string().min(1),
    containerNumber: z.string().min(1),
    type: z.enum(["20ft", "40ft", "40ft_hc"]),
    status: z.enum(["empty", "loaded", "in_transit", "delivered"]).optional(),
});

const updateContainerSchema = z.object({
    containerNumber: z.string().min(1).optional(),
    type: z.enum(["20ft", "40ft", "40ft_hc"]).optional(),
    status: z.enum(["empty", "loaded", "in_transit", "delivered"]).optional(),
});

function mapContainerError(req: Request, error: ContainerError): HttpException {
    req.log.error(error);
    switch (error) {
        case ContainerError.NOT_FOUND:
            return HttpException.notFound();
        case ContainerError.CROSS_TENANT:
            return HttpException.forbidden();
        case ContainerError.SHIPMENT_NOT_FOUND:
            return HttpException.notFound(undefined, "The referenced shipment does not exist");
        case ContainerError.DB_ERROR:
            return HttpException.internal();
    }
}

class ContainersController {
    constructor(private readonly containerService: ContainerService) {}

    list = async (req: Request, res: Response<ContainersResponse["list"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const pagination = parsePagination(req);
        const result = await this.containerService.list(req.auth.tenantId, pagination);
        if (!result.ok) return next(mapContainerError(req, result.ctx));

        res.json(result.data);
    };

    create = async (req: Request, res: Response<ContainersResponse["create"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const parsed = await parseRequestObj(req.body, createContainerSchema);
        if (!parsed.ok) return next(parsed.ctx);

        const result = await this.containerService.create(parsed.data, {
            tenantId: req.auth.tenantId,
            userId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapContainerError(req, result.ctx));

        res.status(201).json(result.data);
    };

    update = async (req: Request, res: Response<ContainersResponse["update"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const id = req.params.id as string;
        if (!id) return next(HttpException.malformedBody());

        const parsed = await parseRequestObj(req.body, updateContainerSchema);
        if (!parsed.ok) return next(parsed.ctx);

        const result = await this.containerService.update(id, parsed.data, {
            tenantId: req.auth.tenantId,
            userId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapContainerError(req, result.ctx));

        res.json(result.data);
    };

    delete = async (req: Request, res: Response<ContainersResponse["delete"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const id = req.params.id as string;
        if (!id) return next(HttpException.malformedBody());

        const result = await this.containerService.delete(id, {
            tenantId: req.auth.tenantId,
            userId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapContainerError(req, result.ctx));

        res.json({msg: "container deleted"});
    };
}

export default ContainersController;
