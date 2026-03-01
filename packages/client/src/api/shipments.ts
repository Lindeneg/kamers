import type {ShipmentsResponse, Shipment, PaginationParams} from "@kamers/shared";
import api from "./client";
import {wrap} from "./wrap";

export type {Shipment};

export function listShipments(params?: Partial<PaginationParams>) {
    return wrap(api.get<ShipmentsResponse["list"]>("/shipments", {params}));
}

export function createShipment(origin: string, destination: string) {
    return wrap(api.post<ShipmentsResponse["create"]>("/shipments", {origin, destination}));
}
