import type {Request, Response, NextFunction} from "express";
import z from "zod";
import type {ShipmentsResponse} from "@kamers/shared";
import {HttpException} from "../lib/http-exception";
import {parsePagination} from "../lib/pagination";
import {parseRequestObj} from "../lib/parse";
import type ShipmentService from "../services/shipment-service";
import {ShipmentError} from "../services/shipment-service";

const createShipmentSchema = z.object({
    referenceNumber: z.string().min(1),
    origin: z.string().min(1),
    destination: z.string().min(1),
    status: z.enum(["pending", "in_transit", "delivered", "customs_hold", "cancelled"]).optional(),
    estimatedArrival: z.string().date().nullable().optional(),
});

const updateShipmentSchema = z.object({
    referenceNumber: z.string().min(1).optional(),
    origin: z.string().min(1).optional(),
    destination: z.string().min(1).optional(),
    status: z.enum(["pending", "in_transit", "delivered", "customs_hold", "cancelled"]).optional(),
    estimatedArrival: z.string().date().nullable().optional(),
});

function mapShipmentError(req: Request, error: ShipmentError): HttpException {
    req.log.error(error);
    switch (error) {
        case ShipmentError.NOT_FOUND:
            return HttpException.notFound();
        case ShipmentError.CROSS_TENANT:
            return HttpException.forbidden();
        case ShipmentError.DUPLICATE_REF:
            return HttpException.unprocessable(undefined, "A shipment with this reference number already exists");
        case ShipmentError.DB_ERROR:
            return HttpException.internal();
    }
}

class ShipmentsController {
    constructor(private readonly shipmentService: ShipmentService) {}

    list = async (req: Request, res: Response<ShipmentsResponse["list"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const pagination = parsePagination(req);
        const result = await this.shipmentService.list(req.auth.tenantId, pagination);
        if (!result.ok) return next(mapShipmentError(req, result.ctx));

        res.json(result.data);
    };

    create = async (req: Request, res: Response<ShipmentsResponse["create"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const parsed = await parseRequestObj(req.body, createShipmentSchema);
        if (!parsed.ok) return next(parsed.ctx);

        const result = await this.shipmentService.create(parsed.data, {
            tenantId: req.auth.tenantId,
            userId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapShipmentError(req, result.ctx));

        res.status(201).json(result.data);
    };

    update = async (req: Request, res: Response<ShipmentsResponse["update"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const id = req.params.id as string;
        if (!id) return next(HttpException.malformedBody());

        const parsed = await parseRequestObj(req.body, updateShipmentSchema);
        if (!parsed.ok) return next(parsed.ctx);

        const result = await this.shipmentService.update(id, parsed.data, {
            tenantId: req.auth.tenantId,
            userId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapShipmentError(req, result.ctx));

        res.json(result.data);
    };

    delete = async (req: Request, res: Response<ShipmentsResponse["delete"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const id = req.params.id as string;
        if (!id) return next(HttpException.malformedBody());

        const result = await this.shipmentService.delete(id, {
            tenantId: req.auth.tenantId,
            userId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapShipmentError(req, result.ctx));

        res.json({msg: "shipment deleted"});
    };
}

export default ShipmentsController;
