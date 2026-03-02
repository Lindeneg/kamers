import type {ContainersResponse, Container, CreateContainerInput, UpdateContainerInput, PaginationParams} from "@kamers/shared";
import api from "./client";
import {wrap, wrapWithValidation} from "./wrap";

export type {Container};

export function listContainers(params?: Partial<PaginationParams>) {
    return wrap(api.get<ContainersResponse["list"]>("/containers", {params}));
}

export function createContainer(data: CreateContainerInput) {
    return wrapWithValidation(api.post<ContainersResponse["create"]>("/containers", data));
}

export function updateContainer(id: string, data: UpdateContainerInput) {
    return wrapWithValidation(api.put<ContainersResponse["update"]>(`/containers/${id}`, data));
}

export function deleteContainer(id: string) {
    return wrap(api.delete<ContainersResponse["delete"]>(`/containers/${id}`));
}
