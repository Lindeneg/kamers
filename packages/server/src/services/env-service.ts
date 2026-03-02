import {success, failure, typedEntries, toInt, type Result} from "@kamers/shared";

type RawEnv = Record<string, string | undefined>;

class EnvService {
    private constructor(
        readonly databaseUrl: string,
        readonly jwtAccessSecret: string,
        readonly jwtRefreshSecret: string,
        readonly clientUrl: string,
        readonly port: number,
        readonly nodeEnv: "test" | "development" | "production",
        readonly googleClientId?: string,
        readonly googleClientSecret?: string,
        readonly microsoftClientId?: string,
        readonly microsoftClientSecret?: string,
        readonly microsoftTenantId?: string
    ) {}

    get test(): boolean {
        return this.nodeEnv === "test";
    }

    get dev(): boolean {
        return this.nodeEnv === "development";
    }

    get prod(): boolean {
        return this.nodeEnv === "production";
    }

    static #parseFlag<TValue = string>(
        prop: string,
        rawEnv: RawEnv,
        transform?: (s: string, property: string) => Result<TValue>
    ): Result<TValue> {
        let val = rawEnv[prop] ?? "";
        if (!val && !transform) {
            return failure(`required envvar '${prop}' is missing`);
        }
        return transform ? transform(val, prop) : success(val as TValue);
    }

    static #parseOptional(prop: string, rawEnv: RawEnv): string | undefined {
        return rawEnv[prop] || undefined;
    }

    public static make(rawEnv: RawEnv): Result<EnvService, string[]> {
        const errors: string[] = [];
        const args = {
            // Always required
            databaseUrl: EnvService.#parseFlag("DATABASE_URL", rawEnv),
            jwtAccessSecret: EnvService.#parseFlag("JWT_ACCESS_SECRET", rawEnv),
            jwtRefreshSecret: EnvService.#parseFlag("JWT_REFRESH_SECRET", rawEnv),
            clientUrl: EnvService.#parseFlag("CLIENT_URL", rawEnv),

            // Optional
            port: EnvService.#parseFlag("PORT", rawEnv, (p) => toInt(p)),
            nodeEnv: EnvService.#parseFlag("NODE_ENV", rawEnv, (m) => success(m ?? "development")),
        } as const;

        const parsed = typedEntries(args).reduce(
            (acc, [key, result]) => {
                if (!result.ok) {
                    errors.push(result.ctx);
                    return acc;
                }
                // TODO fix this `as never` cast.
                acc[key] = result.data as never;
                return acc;
            },
            {} as {-readonly [K in keyof EnvService]: EnvService[K]}
        );

        if (errors.length) return failure(errors);

        return success(
            new EnvService(
                parsed.databaseUrl,
                parsed.jwtAccessSecret,
                parsed.jwtRefreshSecret,
                parsed.clientUrl,
                parsed.port,
                parsed.nodeEnv,
                EnvService.#parseOptional("GOOGLE_CLIENT_ID", rawEnv),
                EnvService.#parseOptional("GOOGLE_CLIENT_SECRET", rawEnv),
                EnvService.#parseOptional("MICROSOFT_CLIENT_ID", rawEnv),
                EnvService.#parseOptional("MICROSOFT_CLIENT_SECRET", rawEnv),
                EnvService.#parseOptional("MICROSOFT_TENANT_ID", rawEnv)
            )
        );
    }
}

export default EnvService;
