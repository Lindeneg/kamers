import {defineStore} from "pinia";
import type {Container, CreateContainerInput, UpdateContainerInput} from "@kamers/shared";
import {listContainers, createContainer, updateContainer, deleteContainer} from "../api/containers";
import {usePaginatedStore} from "./paginated";

export const useContainersStore = defineStore("containers", () => {
    const list = usePaginatedStore<Container>(listContainers);

    async function create(data: CreateContainerInput) {
        const result = await createContainer(data);
        if (result.ok) list.invalidate();
        return result;
    }

    async function update(id: string, data: UpdateContainerInput) {
        const result = await updateContainer(id, data);
        if (result.ok) list.invalidate();
        return result;
    }

    async function remove(id: string) {
        const result = await deleteContainer(id);
        if (result.ok) list.invalidate();
        return result;
    }

    return {...list, create, update, remove};
});
