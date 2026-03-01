import type {Request, Response, NextFunction} from "express";
import type {ShipmentsResponse} from "@kamers/shared";
import {HttpException} from "../lib/http-exception.js";
import {parsePagination} from "../lib/pagination.js";
import type ShipmentService from "../services/shipment-service.js";

class ShipmentsController {
    constructor(private readonly shipmentService: ShipmentService) {}

    list = async (req: Request, res: Response<ShipmentsResponse["list"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const pagination = parsePagination(req);
        const result = await this.shipmentService.list(req.auth.tenantId, pagination);
        if (!result.ok) return next(HttpException.internal());

        res.json(result.data);
    };

    create = async (req: Request, res: Response<ShipmentsResponse["create"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const result = await this.shipmentService.create(req.body, req.auth.tenantId);
        if (!result.ok) return next(HttpException.internal());

        res.status(201).json(result.data);
    };
}

export default ShipmentsController;
