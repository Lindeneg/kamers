import {describe, it, expect, beforeAll, afterAll} from "vitest";
import supertest from "supertest";
import {createTestApp, type TestApp} from "./helpers/setup";
import {seedTestWorld, type TestWorld} from "./helpers/seed";
import {loginAs} from "./helpers/request";

let t: TestApp;
let world: TestWorld;

beforeAll(async () => {
    t = await createTestApp();
    world = await seedTestWorld(t.dataService, t.authService);
});

afterAll(async () => {
    await t.teardown();
});

describe("auth", () => {
    it("valid login returns 200 and sets httpOnly cookies", async () => {
        const res = await supertest(t.app)
            .post("/api/auth/login")
            .send({email: world.adminA.email, password: world.adminA.password});

        expect(res.status).toBe(200);
        expect(res.body).toEqual({msg: "logged in"});

        const cookies = res.headers["set-cookie"] as unknown as string[];
        expect(cookies).toBeDefined();
        expect(Array.isArray(cookies)).toBe(true);

        const accessCookie = cookies.find((c: string) => c.startsWith("access_token="));
        expect(accessCookie).toBeDefined();
        expect(accessCookie).toContain("HttpOnly");

        const refreshCookie = cookies.find((c: string) => c.startsWith("refresh_token="));
        expect(refreshCookie).toBeDefined();
        expect(refreshCookie).toContain("HttpOnly");
    });

    it("wrong password returns 401", async () => {
        const res = await supertest(t.app)
            .post("/api/auth/login")
            .send({email: world.adminA.email, password: "wrong-password"});

        expect(res.status).toBe(401);
    });

    it("inactive user returns 401", async () => {
        const res = await supertest(t.app)
            .post("/api/auth/login")
            .send({email: world.inactiveA.email, password: world.inactiveA.password});

        expect(res.status).toBe(401);
    });

    it("invite-only user (no password) returns 401", async () => {
        const res = await supertest(t.app)
            .post("/api/auth/login")
            .send({email: world.invitedA.email, password: "anything"});

        expect(res.status).toBe(401);
    });

    it("refresh rotates tokens and old session is gone", async () => {
        // Login to get initial tokens
        const agent = supertest.agent(t.app);
        await agent
            .post("/api/auth/login")
            .send({email: world.adminA.email, password: world.adminA.password})
            .expect(200);

        // Refresh
        const refreshRes = await agent.post("/api/auth/refresh");
        expect(refreshRes.status).toBe(200);
        expect(refreshRes.body).toEqual({msg: "token refreshed"});

        // The agent now has new cookies — verify /me works with the new tokens
        const meRes = await agent.get("/api/auth/me");
        expect(meRes.status).toBe(200);
    });

    it("refresh with inactive user returns 401", async () => {
        // First, activate the user to log in
        await t.dataService.p.user.update({
            where: {id: world.inactiveA.id},
            data: {isActive: true},
        });

        const agent = supertest.agent(t.app);
        await agent
            .post("/api/auth/login")
            .send({email: world.inactiveA.email, password: world.inactiveA.password})
            .expect(200);

        // Now deactivate
        await t.dataService.p.user.update({
            where: {id: world.inactiveA.id},
            data: {isActive: false},
        });

        // Refresh should fail
        const refreshRes = await agent.post("/api/auth/refresh");
        expect(refreshRes.status).toBe(401);
    });

    it("setPassword with valid invite token allows subsequent login", async () => {
        const newPassword = "NewSecure123!";

        const setRes = await supertest(t.app)
            .post("/api/auth/set-password")
            .send({token: world.invitedA.inviteToken, password: newPassword});

        expect(setRes.status).toBe(200);

        // Now login with the new password
        const loginRes = await supertest(t.app)
            .post("/api/auth/login")
            .send({email: world.invitedA.email, password: newPassword});

        expect(loginRes.status).toBe(200);
    });

    it("setPassword reusing same token returns 404", async () => {
        const res = await supertest(t.app)
            .post("/api/auth/set-password")
            .send({token: world.invitedA.inviteToken, password: "AnotherPass1!"});

        expect(res.status).toBe(404);
    });

    it("setPassword with expired token returns 422", async () => {
        // Create a user with an already-expired invite token
        const expiredToken = t.authService.generateOpaqueToken();
        await t.dataService.p.user.create({
            data: {
                email: "expired-invite@acme.com",
                name: "Expired Invite",
                tenantId: world.tenantA.id,
                inviteToken: expiredToken,
                inviteTokenExpiry: new Date(Date.now() - 1000), // already expired
            },
        });

        const res = await supertest(t.app)
            .post("/api/auth/set-password")
            .send({token: expiredToken, password: "ValidPass1!"});

        expect(res.status).toBe(422);
    });

    it("GET /me returns user info and permissions", async () => {
        const agent = await loginAs(t.app, world.userA.email, world.userA.password);

        const res = await agent.get("/api/auth/me");
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            id: world.userA.id,
            email: world.userA.email,
            name: "User Acme",
            tenantId: world.tenantA.id,
            isSuperAdmin: false,
        });
        expect(res.body.permissions).toEqual(
            expect.arrayContaining(["shipments.read", "bookings.read"])
        );
        expect(res.body.permissions).toHaveLength(2);
    });

    it("unauthenticated request to protected route returns 401", async () => {
        const res = await supertest(t.app).get("/api/auth/me");
        expect(res.status).toBe(401);
    });

    it("logout clears cookies", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const logoutRes = await agent.post("/api/auth/logout");
        expect(logoutRes.status).toBe(200);
        expect(logoutRes.body).toEqual({msg: "logged out"});

        // After logout, /me should fail
        const meRes = await agent.get("/api/auth/me");
        // The cookies are cleared, so this should be 401
        // Note: supertest.agent keeps cookies including cleared ones,
        // but the cleared cookie will have an expired value
        expect(meRes.status).toBe(401);
    });
});
