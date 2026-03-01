import type LoggerService from "./logger-service.js";

class EmailService {
    constructor(
        private readonly log: LoggerService,
        private readonly clientUrl: string
    ) {}

    sendInviteEmail(to: string, name: string, token: string): void {
        const url = `${this.clientUrl}/set-password?token=${token}`;
        this.log.info(`[EMAIL] Invite for ${name} <${to}>: ${url}`);
    }
}

export default EmailService;
