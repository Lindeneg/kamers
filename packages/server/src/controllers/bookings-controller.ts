import type {Request, Response, NextFunction} from "express";
import z from "zod";
import type {BookingsResponse} from "@kamers/shared";
import {HttpException} from "../lib/http-exception";
import {parsePagination} from "../lib/pagination";
import {parseRequestObj} from "../lib/parse";
import type BookingService from "../services/booking-service";
import {BookingError} from "../services/booking-service";

const createBookingSchema = z.object({
    shipmentId: z.string().min(1),
    customerName: z.string().min(1),
    customerEmail: z.email(),
    status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
});

const updateBookingSchema = z.object({
    customerName: z.string().min(1).optional(),
    customerEmail: z.email().optional(),
    status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
});

function mapBookingError(req: Request, error: BookingError): HttpException {
    req.log.error(error);
    switch (error) {
        case BookingError.NOT_FOUND:
            return HttpException.notFound();
        case BookingError.CROSS_TENANT:
            return HttpException.forbidden();
        case BookingError.SHIPMENT_NOT_FOUND:
            return HttpException.notFound(undefined, "The referenced shipment does not exist");
        case BookingError.DB_ERROR:
            return HttpException.internal();
    }
}

class BookingsController {
    constructor(private readonly bookingService: BookingService) {}

    list = async (req: Request, res: Response<BookingsResponse["list"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const pagination = parsePagination(req);
        const result = await this.bookingService.list(req.auth.tenantId, pagination);
        if (!result.ok) return next(mapBookingError(req, result.ctx));

        res.json(result.data);
    };

    create = async (req: Request, res: Response<BookingsResponse["create"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const parsed = await parseRequestObj(req.body, createBookingSchema);
        if (!parsed.ok) return next(parsed.ctx);

        const result = await this.bookingService.create(parsed.data, {
            tenantId: req.auth.tenantId,
            userId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapBookingError(req, result.ctx));

        res.status(201).json(result.data);
    };

    update = async (req: Request, res: Response<BookingsResponse["update"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const id = req.params.id as string;
        if (!id) return next(HttpException.malformedBody());

        const parsed = await parseRequestObj(req.body, updateBookingSchema);
        if (!parsed.ok) return next(parsed.ctx);

        const result = await this.bookingService.update(id, parsed.data, {
            tenantId: req.auth.tenantId,
            userId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapBookingError(req, result.ctx));

        res.json(result.data);
    };

    delete = async (req: Request, res: Response<BookingsResponse["delete"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const id = req.params.id as string;
        if (!id) return next(HttpException.malformedBody());

        const result = await this.bookingService.delete(id, {
            tenantId: req.auth.tenantId,
            userId: req.auth.userId,
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapBookingError(req, result.ctx));

        res.json({msg: "booking deleted"});
    };
}

export default BookingsController;
