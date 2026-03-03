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

describe("shipments", () => {
    it("list shipments returns paginated results", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.get("/api/shipments");

        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.total).toBeGreaterThanOrEqual(1);
        expect(res.body.page).toBe(1);
    });

    it("create shipment returns 201", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/shipments").send({
            referenceNumber: "NEW-SHP-001",
            origin: "Hamburg",
            destination: "Dubai",
        });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            referenceNumber: "NEW-SHP-001",
            origin: "Hamburg",
            destination: "Dubai",
            status: "pending",
            tenantId: world.tenantA.id,
        });
        expect(res.body.id).toBeDefined();
    });

    it("create shipment with bad payload returns 400 with field errors", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/shipments").send({
            referenceNumber: "",
            origin: "",
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it("create shipment with duplicate reference returns 422", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/shipments").send({
            referenceNumber: world.shipmentA.referenceNumber,
            origin: "Test",
            destination: "Test2",
        });

        expect(res.status).toBe(422);
    });

    it("update shipment returns 200", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.put(`/api/shipments/${world.shipmentA.id}`).send({
            origin: "Ningbo",
        });

        expect(res.status).toBe(200);
        expect(res.body.origin).toBe("Ningbo");
    });

    it("delete shipment returns 200", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        // Create a throwaway shipment to delete
        const created = await agent.post("/api/shipments").send({
            referenceNumber: "DELETE-ME-001",
            origin: "Test",
            destination: "Test2",
        });

        const res = await agent.delete(`/api/shipments/${created.body.id}`);

        expect(res.status).toBe(200);
        expect(res.body.msg).toBe("shipment deleted");
    });

    it("cannot access other tenant's shipment", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const updateRes = await agent.put(`/api/shipments/${world.shipmentB.id}`).send({
            origin: "Hacked",
        });

        expect(updateRes.status).toBe(403);

        const deleteRes = await agent.delete(`/api/shipments/${world.shipmentB.id}`);

        expect(deleteRes.status).toBe(403);
    });

    it("user without write permission cannot create", async () => {
        const agent = await loginAs(t.app, world.userA.email, world.userA.password);

        const res = await agent.post("/api/shipments").send({
            referenceNumber: "UNAUTH-001",
            origin: "Test",
            destination: "Test2",
        });

        expect(res.status).toBe(403);
    });
});
