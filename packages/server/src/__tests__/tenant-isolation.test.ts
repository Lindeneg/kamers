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

describe("tenant isolation", () => {
    it("GET /users returns only own tenant's users", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.get("/api/users");
        expect(res.status).toBe(200);

        const emails: string[] = res.body.data.map((u: any) => u.email);
        // Should contain tenant A users
        expect(emails).toContain(world.adminA.email);
        expect(emails).toContain(world.userA.email);
        // Should NOT contain tenant B users
        expect(emails).not.toContain(world.adminB.email);
        expect(emails).not.toContain(world.userB.email);
    });

    it("GET /users?tenantId=otherTenant returns 403 for regular admin", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.get(`/api/users?tenantId=${world.tenantB.id}`);
        expect(res.status).toBe(403);
    });

    it("GET /users?tenantId=otherTenant returns 200 for super admin", async () => {
        const agent = await loginAs(t.app, world.superAdmin.email, world.superAdmin.password);

        const res = await agent.get(`/api/users?tenantId=${world.tenantB.id}`);
        expect(res.status).toBe(200);

        const emails: string[] = res.body.data.map((u: any) => u.email);
        expect(emails).toContain(world.adminB.email);
        expect(emails).toContain(world.userB.email);
    });

    it("GET /audit-logs?tenantId=otherTenant returns 403 for regular admin", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.get(`/api/audit-logs?tenantId=${world.tenantB.id}`);
        expect(res.status).toBe(403);
    });

    it("GET /audit-logs?tenantId=otherTenant returns 200 for super admin", async () => {
        const agent = await loginAs(t.app, world.superAdmin.email, world.superAdmin.password);

        const res = await agent.get(`/api/audit-logs?tenantId=${world.tenantB.id}`);
        expect(res.status).toBe(200);
    });

    it("PUT /users/:id/permissions on user in other tenant returns 403", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent
            .put(`/api/users/${world.userB.id}/permissions`)
            .send({permissions: ["shipments.read"]});

        expect(res.status).toBe(403);
    });
});
