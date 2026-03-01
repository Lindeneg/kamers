import {
    success,
    failure,
    type Result,
    type Shipment,
    type ShipmentsResponse,
    type PaginationParams,
} from "@kamers/shared";
import {paginate, toSkipTake} from "../lib/pagination.js";

const STUB_SHIPMENTS = [
    {
        id: "shp_001",
        origin: "Shanghai",
        destination: "Rotterdam",
        status: "in_transit",
    },
    {
        id: "shp_002",
        origin: "Busan",
        destination: "Los Angeles",
        status: "delivered",
    },
];

class ShipmentService {
    async list(
        tenantId: string,
        pagination: PaginationParams
    ): Promise<Result<ShipmentsResponse["list"]>> {
        const all = STUB_SHIPMENTS.map((s) => ({...s, tenantId}));
        const {skip, take} = toSkipTake(pagination);
        const sliced = all.slice(skip, skip + take);
        return success(paginate(sliced, all.length, pagination));
    }

    async getById(id: string, tenantId: string): Promise<Result<ShipmentsResponse["getById"]>> {
        const shipment = STUB_SHIPMENTS.find((s) => s.id === id);
        if (!shipment) return failure("shipment not found");
        return success({...shipment, tenantId});
    }

    async create(
        body: {origin: string; destination: string},
        tenantId: string
    ): Promise<Result<ShipmentsResponse["create"]>> {
        return success({
            id: "shp_new",
            ...body,
            tenantId,
            status: "pending",
        });
    }
}

export default ShipmentService;
