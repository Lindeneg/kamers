import {describe, it, expect, beforeAll, afterAll} from "vitest";
import {PERMISSIONS} from "@kamers/shared";
import {createTestApp, type TestApp} from "./helpers/setup";
import {seedTestWorld, type TestWorld} from "./helpers/seed";
import {loginAs} from "./helpers/request";

const allPermissions = Object.values(PERMISSIONS);

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

    it("transfer ownership grants all permissions to new admin", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.put(`/api/users/${world.userA.id}/transfer-ownership`);
        expect(res.status).toBe(200);

        // Verify new admin has ALL permissions
        const newAdminPerms = await t.dataService.p.userPermission.findMany({
            where: {userId: world.userA.id},
            include: {permission: true},
        });
        const slugs = newAdminPerms.map((up) => up.permission.slug).sort();
        expect(slugs).toEqual([...allPermissions].sort());

        // Verify new admin is isTenantAdmin
        const newAdmin = await t.dataService.p.user.findUnique({where: {id: world.userA.id}});
        expect(newAdmin!.isTenantAdmin).toBe(true);

        // Verify old admin kept their permissions but lost isTenantAdmin
        const oldAdmin = await t.dataService.p.user.findUnique({where: {id: world.adminA.id}});
        expect(oldAdmin!.isTenantAdmin).toBe(false);
        const oldAdminPerms = await t.dataService.p.userPermission.findMany({
            where: {userId: world.adminA.id},
        });
        expect(oldAdminPerms.length).toBe(allPermissions.length);

        // Restore for other tests
        await t.dataService.p.$transaction([
            t.dataService.p.user.update({where: {id: world.adminA.id}, data: {isTenantAdmin: true}}),
            t.dataService.p.user.update({where: {id: world.userA.id}, data: {isTenantAdmin: false}}),
        ]);
        // Restore userA's permissions to original (shipments.read, bookings.read)
        await t.dataService.p.userPermission.deleteMany({where: {userId: world.userA.id}});
        const permsToRestore = await t.dataService.p.permission.findMany({
            where: {slug: {in: ["shipments.read", "bookings.read"]}},
        });
        for (const p of permsToRestore) {
            await t.dataService.p.userPermission.create({
                data: {userId: world.userA.id, permissionId: p.id},
            });
        }
    });
});

describe("user deactivation", () => {
    it("deactivate user returns 200 and sets isActive false", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.patch(`/api/users/${world.userA.id}/active`).send({isActive: false});
        expect(res.status).toBe(200);

        const user = await t.dataService.p.user.findUnique({where: {id: world.userA.id}});
        expect(user!.isActive).toBe(false);
    });

    it("deactivated user cannot log in (401)", async () => {
        const agent = (await import("supertest")).default.agent(t.app);
        const res = await agent.post("/api/auth/login").send({
            email: world.userA.email,
            password: world.userA.password,
        });
        expect(res.status).toBe(401);
    });

    it("reactivate user returns 200", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.patch(`/api/users/${world.userA.id}/active`).send({isActive: true});
        expect(res.status).toBe(200);

        const user = await t.dataService.p.user.findUnique({where: {id: world.userA.id}});
        expect(user!.isActive).toBe(true);
    });

    it("reactivated user can log in", async () => {
        const agent = await loginAs(t.app, world.userA.email, world.userA.password);
        const res = await agent.get("/api/auth/me");
        expect(res.status).toBe(200);
    });

    it("cannot deactivate self (403)", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.patch(`/api/users/${world.adminA.id}/active`).send({isActive: false});
        expect(res.status).toBe(403);
    });

    it("cannot deactivate tenant admin (403)", async () => {
        // Login as super admin (who has users.write) to try deactivating adminA
        const agent = await loginAs(t.app, world.superAdmin.email, world.superAdmin.password);

        const res = await agent.patch(`/api/users/${world.adminA.id}/active`).send({isActive: false});
        expect(res.status).toBe(403);
    });
});

describe("user soft delete", () => {
    it("delete user returns 200 and sets deletedAt", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        // Create a temporary user to delete
        const inviteRes = await agent.post("/api/users/invite").send({
            email: "todelete@acme.com",
            name: "To Delete",
        });
        const userId = inviteRes.body.id;

        // Set password so we can test login later
        await t.dataService.p.user.update({
            where: {id: userId},
            data: {
                passwordHash: (await t.dataService.p.user.findUnique({where: {id: world.userA.id}}))!.passwordHash,
                inviteToken: null,
                inviteTokenExpiry: null,
            },
        });

        const res = await agent.delete(`/api/users/${userId}`);
        expect(res.status).toBe(200);

        const user = await t.dataService.p.user.findUnique({where: {id: userId}});
        expect(user!.deletedAt).not.toBeNull();
        expect(user!.isActive).toBe(false);
    });

    it("deleted user no longer appears in user list", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.get("/api/users");
        expect(res.status).toBe(200);

        const emails = res.body.data.map((u: any) => u.email);
        expect(emails).not.toContain("todelete@acme.com");
    });

    it("deleted user cannot log in (401)", async () => {
        const agent = (await import("supertest")).default.agent(t.app);
        const res = await agent.post("/api/auth/login").send({
            email: "todelete@acme.com",
            password: world.userA.password,
        });
        expect(res.status).toBe(401);
    });

    it("can re-invite same email after user is deleted", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/users/invite").send({
            email: "todelete@acme.com",
            name: "Re-invited",
        });
        expect(res.status).toBe(201);
    });

    it("cannot delete tenant admin (403)", async () => {
        const agent = await loginAs(t.app, world.superAdmin.email, world.superAdmin.password);

        const res = await agent.delete(`/api/users/${world.adminA.id}`);
        expect(res.status).toBe(403);
    });
});
