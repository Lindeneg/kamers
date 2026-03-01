import type {AxiosResponse} from "axios";
import {success, failure, type Result} from "@kamers/shared";

export async function wrap<T>(promise: Promise<AxiosResponse<T>>): Promise<Result<T>> {
    try {
        const res = await promise;
        return success(res.data);
    } catch (e: any) {
        return failure(e.response?.data?.msg ?? "Something went wrong. Please try again later.");
    }
}
