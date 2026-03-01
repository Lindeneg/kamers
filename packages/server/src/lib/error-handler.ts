import type {Request, Response, NextFunction} from "express";
import {HttpException} from "../lib/http-exception";

export type GlobalErrorHandler = (
    error: any,
    _: Request,
    res: Response,
    next: NextFunction
) => void;

export const globalErrorHandler: GlobalErrorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        req.log.error({err: error}, "error after headers sent");
        return next(error);
    }
    if (error instanceof HttpException) {
        req.log.warn({statusCode: error.statusCode}, error.message);
        res.status(error.statusCode).json(error.toResponse());
    } else if (error instanceof Error) {
        req.log.error({err: error}, "unhandled error");
        res.status(500).json(error.message);
    } else {
        req.log.error({err: error}, "unknown error");
        res.status(500).json({
            message: "Something went wrong. Please try again.",
        });
    }
};
