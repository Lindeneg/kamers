import {config} from "dotenv";
import {emptySuccess, failure, type EmptyResult} from "./result.js";

function load(name: string, path: string) {
    const result = config({path, override: true});
    if (result.error) return failure(result.error.message);
    console.log(name + " loaded environment:", path);
    return emptySuccess();
}

export function loadEnv(name: string, args: string[] | undefined, flag = "-E"): EmptyResult {
    let curEnvPath = ".env";
    if (!args) return load(name, curEnvPath);
    const flagIdx = args?.findIndex((arg) => arg === flag);
    if (flagIdx === -1) return load(name, curEnvPath);
    const value = args[flagIdx + 1];
    if (!value) return load(name, curEnvPath);
    return load(name, (curEnvPath += "." + value));
}
