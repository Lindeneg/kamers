import {describe, it, expect, beforeAll, afterAll} from "vitest";
import supertest from "supertest";
import {PERMISSIONS} from "@kamers/shared";
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

describe("permission enforcement", () => {
    // userA has only shipments.read + bookings.read

    it("returns 403 for routes without required permission", async () => {
        const agent = await loginAs(t.app, world.userA.email, world.userA.password);

        // containers.read — userA doesn't have this
        const containersRes = await agent.get("/api/shipments").expect(200); // has shipments.read
        const bookingsRes = await agent.get("/api/users"); // needs users.read
        expect(bookingsRes.status).toBe(403);

        // shipments.write — userA doesn't have this
        const writeRes = await agent.post("/api/shipments").send({origin: "A", destination: "B"});
        expect(writeRes.status).toBe(403);

        // audit.read — userA doesn't have this
        const auditRes = await agent.get("/api/audit-logs");
        expect(auditRes.status).toBe(403);
    });

    it("returns 200 for routes with required permission", async () => {
        const agent = await loginAs(t.app, world.userA.email, world.userA.password);

        // userA has shipments.read
        const shipmentsRes = await agent.get("/api/shipments");
        expect(shipmentsRes.status).toBe(200);
    });

    it("revoking permission mid-session causes next request to return 403", async () => {
        const agent = await loginAs(t.app, world.userA.email, world.userA.password);

        // Verify access works
        const before = await agent.get("/api/shipments");
        expect(before.status).toBe(200);

        // Revoke shipments.read
        const perm = await t.dataService.p.permission.findUnique({
            where: {slug: PERMISSIONS.SHIPMENTS_READ},
        });
        await t.dataService.p.userPermission.delete({
            where: {userId_permissionId: {userId: world.userA.id, permissionId: perm!.id}},
        });

        // Next request should be 403
        const after = await agent.get("/api/shipments");
        expect(after.status).toBe(403);

        // Restore for other tests
        await t.dataService.p.userPermission.create({
            data: {userId: world.userA.id, permissionId: perm!.id},
        });
    });

    it("POST /tenants by non-super-admin returns 403", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/tenants").send({
            name: "New Tenant",
            domains: ["newtenant.com"],
            adminEmail: "admin@newtenant.com",
            adminName: "Admin",
        });

        expect(res.status).toBe(403);
    });

    it("GET /tenants by non-super-admin returns 403", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.get("/api/tenants");
        expect(res.status).toBe(403);
    });

    it("cannot modify own permissions", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent
            .put(`/api/users/${world.adminA.id}/permissions`)
            .send({permissions: ["shipments.read"]});

        expect(res.status).toBe(403);
    });

    it("cannot modify tenant admin permissions", async () => {
        // Create a non-admin user with users.write to attempt this
        // superAdmin has users.write and is in tenant A, but adminA is a tenant admin
        const agent = await loginAs(t.app, world.superAdmin.email, world.superAdmin.password);

        const res = await agent
            .put(`/api/users/${world.adminA.id}/permissions`)
            .send({permissions: ["shipments.read"]});

        expect(res.status).toBe(403);
    });

    it("unknown permission slugs are silently handled", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent
            .put(`/api/users/${world.userA.id}/permissions`)
            .send({permissions: ["shipments.read", "nonexistent.perm", "bookings.read"]});

        expect(res.status).toBe(200);

        // Verify the valid permissions are still there
        const meAgent = await loginAs(t.app, world.userA.email, world.userA.password);
        const meRes = await meAgent.get("/api/auth/me");
        expect(meRes.body.permissions).toEqual(
            expect.arrayContaining(["shipments.read", "bookings.read"])
        );
    });
});
