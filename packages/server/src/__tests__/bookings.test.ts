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

describe("bookings", () => {
    it("list bookings returns paginated results", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.get("/api/bookings");

        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.page).toBe(1);
    });

    it("create booking returns 201", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/bookings").send({
            shipmentId: world.shipmentA.id,
            customerName: "Test Customer",
            customerEmail: "test@example.com",
        });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            shipmentId: world.shipmentA.id,
            customerName: "Test Customer",
            customerEmail: "test@example.com",
            status: "pending",
            tenantId: world.tenantA.id,
        });
    });

    it("create booking with bad payload returns 400", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/bookings").send({
            shipmentId: world.shipmentA.id,
            customerName: "",
            customerEmail: "not-an-email",
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it("create booking with non-existent shipmentId returns 404", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/bookings").send({
            shipmentId: "non-existent-id",
            customerName: "Test",
            customerEmail: "test@example.com",
        });

        expect(res.status).toBe(404);
    });

    it("create booking for other tenant's shipment returns 403", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/bookings").send({
            shipmentId: world.shipmentB.id,
            customerName: "Cross Tenant",
            customerEmail: "cross@example.com",
        });

        expect(res.status).toBe(403);
    });

    it("update booking returns 200", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        // Create a booking to update
        const created = await agent.post("/api/bookings").send({
            shipmentId: world.shipmentA.id,
            customerName: "Original Name",
            customerEmail: "original@example.com",
        });

        const res = await agent.put(`/api/bookings/${created.body.id}`).send({
            customerName: "Updated Name",
        });

        expect(res.status).toBe(200);
        expect(res.body.customerName).toBe("Updated Name");
    });

    it("delete booking returns 200", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        // Create a throwaway booking
        const created = await agent.post("/api/bookings").send({
            shipmentId: world.shipmentA.id,
            customerName: "Delete Me",
            customerEmail: "delete@example.com",
        });

        const res = await agent.delete(`/api/bookings/${created.body.id}`);

        expect(res.status).toBe(200);
        expect(res.body.msg).toBe("booking deleted");
    });

    it("cannot update other tenant's booking", async () => {
        // Create a booking in tenant B
        const agentB = await loginAs(t.app, world.adminB.email, world.adminB.password);
        const created = await agentB.post("/api/bookings").send({
            shipmentId: world.shipmentB.id,
            customerName: "Tenant B Booking",
            customerEmail: "b@example.com",
        });

        // Try to update from tenant A
        const agentA = await loginAs(t.app, world.adminA.email, world.adminA.password);
        const res = await agentA.put(`/api/bookings/${created.body.id}`).send({
            customerName: "Hacked",
        });

        expect(res.status).toBe(403);
    });
});
