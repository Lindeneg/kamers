import {defineStore} from "pinia";
import type {Shipment, CreateShipmentInput, UpdateShipmentInput} from "@kamers/shared";
import {listShipments, createShipment, updateShipment, deleteShipment} from "../api/shipments";
import {usePaginatedStore} from "./paginated";

export const useShipmentsStore = defineStore("shipments", () => {
    const list = usePaginatedStore<Shipment>(listShipments);

    async function create(data: CreateShipmentInput) {
        const result = await createShipment(data);
        if (result.ok) list.invalidate();
        return result;
    }

    async function update(id: string, data: UpdateShipmentInput) {
        const result = await updateShipment(id, data);
        if (result.ok) list.invalidate();
        return result;
    }

    async function remove(id: string) {
        const result = await deleteShipment(id);
        if (result.ok) list.invalidate();
        return result;
    }

    return {...list, create, update, remove};
});
