import {defineStore} from "pinia";
import type {Shipment} from "@kamers/shared";
import {listShipments, createShipment} from "../api/shipments";
import {usePaginatedStore} from "./paginated";

export const useShipmentsStore = defineStore("shipments", () => {
    const list = usePaginatedStore<Shipment>(listShipments);

    // TODO: Instead of invalidating, push the created shipment into the cache directly
    // (the API response contains the full entity). Invalidation discards all cached pages
    // and forces a refetch — unnecessary when we already have the data.
    async function create(origin: string, destination: string) {
        const result = await createShipment(origin, destination);
        if (result.ok) list.invalidate();
        return result;
    }

    return {...list, create};
});
