import {Google, MicrosoftEntraId, generateState, generateCodeVerifier, decodeIdToken} from "arctic";
import {success, failure, type Result} from "@kamers/shared";
import type EnvService from "./env-service";
import type LoggerService from "./logger-service";

export interface OAuthProfile {
    sub: string;
    email: string;
    name: string;
    picture?: string;
}

const SCOPES = ["openid", "email", "profile"];

class OAuthService {
    private google?: Google;
    private microsoft?: MicrosoftEntraId;

    constructor(
        env: EnvService,
        private readonly log: LoggerService
    ) {
        if (env.googleClientId && env.googleClientSecret) {
            this.google = new Google(
                env.googleClientId,
                env.googleClientSecret,
                env.clientUrl + "/api/auth/oauth/google/callback"
            );
        }
        if (env.microsoftClientId && env.microsoftClientSecret && env.microsoftTenantId) {
            this.microsoft = new MicrosoftEntraId(
                env.microsoftTenantId,
                env.microsoftClientId,
                env.microsoftClientSecret,
                env.clientUrl + "/api/auth/oauth/microsoft/callback"
            );
        }
    }

    getEnabledProviders(): string[] {
        const providers: string[] = [];
        if (this.google) providers.push("google");
        if (this.microsoft) providers.push("microsoft");
        return providers;
    }

    createAuthorizationURL(provider: string): Result<{url: URL; state: string; codeVerifier: string}> {
        const instance = this.getProvider(provider);
        if (!instance) return failure(`provider '${provider}' is not configured`);

        const state = generateState();
        const codeVerifier = generateCodeVerifier();
        const url = instance.createAuthorizationURL(state, codeVerifier, SCOPES);

        return success({url, state, codeVerifier});
    }

    async validateCallback(
        provider: string,
        code: string,
        codeVerifier: string
    ): Promise<Result<OAuthProfile>> {
        const instance = this.getProvider(provider);
        if (!instance) return failure(`provider '${provider}' is not configured`);

        try {
            const tokens = await instance.validateAuthorizationCode(code, codeVerifier);
            const claims = decodeIdToken(tokens.idToken()) as Record<string, unknown>;

            const sub = claims.sub as string | undefined;
            const email = claims.email as string | undefined;
            const name = (claims.name as string | undefined) ?? email ?? "";
            const picture = claims.picture as string | undefined;

            if (!sub || !email) {
                return failure("id token missing required claims (sub, email)");
            }

            return success({sub, email, name, picture});
        } catch (err) {
            this.log.error(err, "oauth callback validation failed");
            return failure("oauth callback validation failed");
        }
    }

    private getProvider(provider: string): Google | MicrosoftEntraId | undefined {
        if (provider === "google") return this.google;
        if (provider === "microsoft") return this.microsoft;
        return undefined;
    }
}

export default OAuthService;
