import type {ShipmentsResponse, Shipment, PaginationParams} from "@kamers/shared";
import api from "./client";

export type {Shipment};

export function listShipments(params?: Partial<PaginationParams>) {
    return api.get<ShipmentsResponse["list"]>("/shipments", {params});
}

export function getShipment(id: string) {
    return api.get<ShipmentsResponse["getById"]>(`/shipments/${id}`);
}

export function createShipment(origin: string, destination: string) {
    return api.post<ShipmentsResponse["create"]>("/shipments", {origin, destination});
}
