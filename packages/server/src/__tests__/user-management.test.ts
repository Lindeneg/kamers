import {describe, it, expect, beforeAll, afterAll} from "vitest";
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

describe("user management", () => {
    it("invite creates a new user with 201", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/users/invite").send({
            email: "newuser@acme.com",
            name: "New User",
        });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            email: "newuser@acme.com",
        });
        expect(res.body.id).toBeDefined();
    });

    it("invite with duplicate email returns 422", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        // user@acme.com already exists from seed
        const res = await agent.post("/api/users/invite").send({
            email: world.userA.email,
            name: "Duplicate",
        });

        expect(res.status).toBe(422);
    });

    it("transfer ownership swaps isTenantAdmin atomically", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.put(`/api/users/${world.userA.id}/transfer-ownership`);
        expect(res.status).toBe(200);

        // Verify in DB
        const oldAdmin = await t.dataService.p.user.findUnique({where: {id: world.adminA.id}});
        const newAdmin = await t.dataService.p.user.findUnique({where: {id: world.userA.id}});
        expect(oldAdmin!.isTenantAdmin).toBe(false);
        expect(newAdmin!.isTenantAdmin).toBe(true);

        // Restore for other tests
        await t.dataService.p.$transaction([
            t.dataService.p.user.update({where: {id: world.adminA.id}, data: {isTenantAdmin: true}}),
            t.dataService.p.user.update({where: {id: world.userA.id}, data: {isTenantAdmin: false}}),
        ]);
    });

    it("non-admin cannot transfer ownership (403)", async () => {
        const agent = await loginAs(t.app, world.userA.email, world.userA.password);

        // userA doesn't have users.write permission
        const res = await agent.put(`/api/users/${world.adminA.id}/transfer-ownership`);
        expect(res.status).toBe(403);
    });

    it("transfer to other-tenant user returns 403", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.put(`/api/users/${world.userB.id}/transfer-ownership`);
        expect(res.status).toBe(403);
    });
});
