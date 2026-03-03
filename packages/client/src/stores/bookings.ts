import {defineStore} from "pinia";
import type {Booking, CreateBookingInput, UpdateBookingInput} from "@kamers/shared";
import {listBookings, createBooking, updateBooking, deleteBooking} from "../api/bookings";
import {usePaginatedStore} from "./paginated";

export const useBookingsStore = defineStore("bookings", () => {
    const list = usePaginatedStore<Booking>(listBookings);

    async function create(data: CreateBookingInput) {
        const result = await createBooking(data);
        if (result.ok) list.invalidate();
        return result;
    }

    async function update(id: string, data: UpdateBookingInput) {
        const result = await updateBooking(id, data);
        if (result.ok) list.invalidate();
        return result;
    }

    async function remove(id: string) {
        const result = await deleteBooking(id);
        if (result.ok) list.invalidate();
        return result;
    }

    return {...list, create, update, remove};
});
