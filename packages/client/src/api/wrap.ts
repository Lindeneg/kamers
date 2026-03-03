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

export type ValidationFailure = {
    msg: string;
    fieldErrors?: Record<string, string>;
};

export async function wrapWithValidation<T>(
    promise: Promise<AxiosResponse<T>>
): Promise<Result<T, ValidationFailure>> {
    try {
        const res = await promise;
        return success(res.data);
    } catch (e: any) {
        const data = e.response?.data;
        const msg = data?.msg ?? "Something went wrong. Please try again later.";
        let fieldErrors: Record<string, string> | undefined;

        if (data?.error && typeof data.error === "object") {
            fieldErrors = {};
            for (const [key, val] of Object.entries(data.error)) {
                if (val && typeof val === "object" && "errors" in val && Array.isArray((val as any).errors)) {
                    fieldErrors[key] = (val as any).errors[0];
                }
            }
            if (Object.keys(fieldErrors).length === 0) fieldErrors = undefined;
        }

        return failure({msg, fieldErrors});
    }
}
