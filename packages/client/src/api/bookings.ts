import type {BookingsResponse, Booking, CreateBookingInput, UpdateBookingInput, PaginationParams} from "@kamers/shared";
import api from "./client";
import {wrap, wrapWithValidation} from "./wrap";

export type {Booking};

export function listBookings(params?: Partial<PaginationParams>) {
    return wrap(api.get<BookingsResponse["list"]>("/bookings", {params}));
}

export function createBooking(data: CreateBookingInput) {
    return wrapWithValidation(api.post<BookingsResponse["create"]>("/bookings", data));
}

export function updateBooking(id: string, data: UpdateBookingInput) {
    return wrapWithValidation(api.put<BookingsResponse["update"]>(`/bookings/${id}`, data));
}

export function deleteBooking(id: string) {
    return wrap(api.delete<BookingsResponse["delete"]>(`/bookings/${id}`));
}
