import type {ShipmentsResponse, Shipment, CreateShipmentInput, UpdateShipmentInput, PaginationParams} from "@kamers/shared";
import api from "./client";
import {wrap, wrapWithValidation} from "./wrap";

export type {Shipment};

export function listShipments(params?: Partial<PaginationParams>) {
    return wrap(api.get<ShipmentsResponse["list"]>("/shipments", {params}));
}

export function createShipment(data: CreateShipmentInput) {
    return wrapWithValidation(api.post<ShipmentsResponse["create"]>("/shipments", data));
}

export function updateShipment(id: string, data: UpdateShipmentInput) {
    return wrapWithValidation(api.put<ShipmentsResponse["update"]>(`/shipments/${id}`, data));
}

export function deleteShipment(id: string) {
    return wrap(api.delete<ShipmentsResponse["delete"]>(`/shipments/${id}`));
}
