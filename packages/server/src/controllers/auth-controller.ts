import type {Request, Response, NextFunction} from "express";
import z from "zod";
import type {AuthResponse} from "@kamers/shared";
import {HttpException} from "../lib/http-exception";
import {parseRequestObj} from "../lib/parse";
import type AuthService from "../services/auth-service";
import type AuthSessionService from "../services/auth-session-service";
import {AuthSessionError} from "../services/auth-session-service";
import type OAuthService from "../services/oauth-service";
import type EnvService from "../services/env-service";

const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

const setPasswordSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(8),
});

function mapAuthError(req: Request, error: AuthSessionError): HttpException {
    req.log.error(error);
    switch (error) {
        case AuthSessionError.INVALID_CREDENTIALS:
        case AuthSessionError.USER_NOT_FOUND:
        case AuthSessionError.USER_INACTIVE:
        case AuthSessionError.NO_REFRESH_TOKEN:
        case AuthSessionError.SESSION_EXPIRED:
            return HttpException.unauthorized();
        case AuthSessionError.TOKEN_NOT_FOUND:
            return HttpException.notFound();
        case AuthSessionError.TOKEN_EXPIRED:
            return HttpException.unprocessable(undefined, "Invite token has expired");
        case AuthSessionError.DB_ERROR:
            return HttpException.internal();
        case AuthSessionError.OAUTH_ERROR:
            return HttpException.unprocessable(undefined, "OAuth authentication failed");
    }
}

const OAUTH_COOKIE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly authSessionService: AuthSessionService,
        private readonly oauthService: OAuthService,
        private readonly env: EnvService
    ) {}

    login = async (req: Request, res: Response<AuthResponse["login"]>, next: NextFunction) => {
        const parsed = await parseRequestObj(req.body, loginSchema);
        if (!parsed.ok) return next(parsed.ctx);

        const result = await this.authSessionService.login(parsed.data, {
            userAgent: req.headers["user-agent"],
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapAuthError(req, result.ctx));

        this.authService.setAuthCookies(res, result.data.accessToken, result.data.refreshToken);

        res.json({msg: "logged in"});
    };

    logout = async (req: Request, res: Response<AuthResponse["logout"]>, _: NextFunction) => {
        await this.authSessionService.logout(req.cookies?.refresh_token, {
            ipAddress: req.ip,
        });
        this.authService.clearAuthCookies(res);
        res.json({msg: "logged out"});
    };

    refresh = async (req: Request, res: Response<AuthResponse["refresh"]>, next: NextFunction) => {
        if (!req.cookies?.refresh_token) return next(HttpException.unauthorized());
        const result = await this.authSessionService.refresh(req.cookies?.refresh_token, {
            userAgent: req.headers["user-agent"],
            ipAddress: req.ip,
        });
        if (!result.ok) return next(mapAuthError(req, result.ctx));

        this.authService.setAuthCookies(res, result.data.accessToken, result.data.refreshToken);

        res.json({msg: "token refreshed"});
    };

    me = async (req: Request, res: Response<AuthResponse["me"]>, next: NextFunction) => {
        if (!req.auth) return next(HttpException.unauthorized());

        const result = await this.authSessionService.getMe(req.auth.userId);
        if (!result.ok) return next(mapAuthError(req, result.ctx));

        res.json(result.data);
    };

    setPassword = async (
        req: Request,
        res: Response<AuthResponse["setPassword"]>,
        next: NextFunction
    ) => {
        const parsed = await parseRequestObj(req.body, setPasswordSchema);
        if (!parsed.ok) return next(parsed.ctx);

        const result = await this.authSessionService.setPassword(parsed.data, req.ip);
        if (!result.ok) return next(mapAuthError(req, result.ctx));

        res.json({msg: "password set successfully"});
    };

    oauthProviders = (
        _req: Request,
        res: Response<AuthResponse["oauthProviders"]>,
        _next: NextFunction
    ) => {
        res.json({providers: this.oauthService.getEnabledProviders()});
    };

    oauthStart = (req: Request, res: Response, next: NextFunction) => {
        const provider = req.params.provider as string;
        const result = this.oauthService.createAuthorizationURL(provider);
        if (!result.ok) return next(HttpException.notFound());

        const {url, state, codeVerifier} = result.data;
        const cookieOpts = {
            httpOnly: true,
            secure: this.env.prod,
            sameSite: "lax" as const,
            maxAge: OAUTH_COOKIE_MAX_AGE,
        };

        res.cookie("oauth_state", state, cookieOpts);
        res.cookie("oauth_code_verifier", codeVerifier, cookieOpts);
        res.redirect(url.toString());
    };

    oauthCallback = async (req: Request, res: Response, _next: NextFunction) => {
        const provider = req.params.provider as string;
        const code = req.query.code as string | undefined;
        const state = req.query.state as string | undefined;
        const storedState = req.cookies?.oauth_state as string | undefined;
        const codeVerifier = req.cookies?.oauth_code_verifier as string | undefined;

        // Clear OAuth cookies regardless of outcome
        res.clearCookie("oauth_state");
        res.clearCookie("oauth_code_verifier");

        if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
            return res.redirect(this.env.clientUrl + "/login?error=oauth_failed");
        }

        const profileResult = await this.oauthService.validateCallback(provider, code, codeVerifier);
        if (!profileResult.ok) {
            return res.redirect(this.env.clientUrl + "/login?error=oauth_failed");
        }

        const loginResult = await this.authSessionService.oauthLogin(provider, profileResult.data, {
            userAgent: req.headers["user-agent"],
            ipAddress: req.ip,
        });
        if (!loginResult.ok) {
            return res.redirect(this.env.clientUrl + "/login?error=oauth_failed");
        }

        this.authService.setAuthCookies(
            res,
            loginResult.data.accessToken,
            loginResult.data.refreshToken
        );
        res.redirect(this.env.clientUrl);
    };
}

export default AuthController;
