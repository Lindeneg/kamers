import {
    success,
    failure,
    type Result,
    type Shipment,
    type ShipmentsResponse,
    type PaginationParams,
} from "@kamers/shared";
import {paginate, toSkipTake} from "../lib/pagination.js";

const PORTS = [
    "Shanghai", "Rotterdam", "Busan", "Los Angeles", "Singapore",
    "Ningbo", "Hamburg", "Antwerp", "Qingdao", "Dubai",
    "Felixstowe", "Colombo", "Tanjung Pelepas", "Kaohsiung", "Piraeus",
    "Valencia", "Algeciras", "Yokohama", "Long Beach", "Savannah",
];

const STATUSES = ["pending", "in_transit", "delivered", "customs_hold", "cancelled"];

function generateShipments() {
    const shipments: {id: string; origin: string; destination: string; status: string}[] = [];
    for (let i = 1; i <= 62; i++) {
        const originIdx = (i - 1) % PORTS.length;
        let destIdx = (i * 7) % PORTS.length;
        if (destIdx === originIdx) destIdx = (destIdx + 1) % PORTS.length;
        shipments.push({
            id: `shp_${String(i).padStart(3, "0")}`,
            origin: PORTS[originIdx]!,
            destination: PORTS[destIdx]!,
            status: STATUSES[i % STATUSES.length]!,
        });
    }
    return shipments;
}

const STUB_SHIPMENTS = generateShipments();

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
