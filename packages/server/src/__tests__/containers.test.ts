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

describe("containers", () => {
    it("list containers returns paginated results", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.get("/api/containers");

        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.page).toBe(1);
    });

    it("create container returns 201", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/containers").send({
            shipmentId: world.shipmentA.id,
            containerNumber: "TESTU1234567",
            type: "40ft",
        });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            shipmentId: world.shipmentA.id,
            containerNumber: "TESTU1234567",
            type: "40ft",
            status: "empty",
            tenantId: world.tenantA.id,
        });
    });

    it("create container with bad payload returns 400", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/containers").send({
            shipmentId: world.shipmentA.id,
            containerNumber: "",
            type: "invalid_type",
        });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it("create container with non-existent shipmentId returns 404", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/containers").send({
            shipmentId: "non-existent-id",
            containerNumber: "FAKE1234567",
            type: "20ft",
        });

        expect(res.status).toBe(404);
    });

    it("create container for other tenant's shipment returns 403", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        const res = await agent.post("/api/containers").send({
            shipmentId: world.shipmentB.id,
            containerNumber: "CROSS1234567",
            type: "20ft",
        });

        expect(res.status).toBe(403);
    });

    it("update container returns 200", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        // Create a container to update
        const created = await agent.post("/api/containers").send({
            shipmentId: world.shipmentA.id,
            containerNumber: "UPDT1234567",
            type: "20ft",
        });

        const res = await agent.put(`/api/containers/${created.body.id}`).send({
            status: "loaded",
        });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("loaded");
    });

    it("delete container returns 200", async () => {
        const agent = await loginAs(t.app, world.adminA.email, world.adminA.password);

        // Create a throwaway container
        const created = await agent.post("/api/containers").send({
            shipmentId: world.shipmentA.id,
            containerNumber: "DELT1234567",
            type: "40ft_hc",
        });

        const res = await agent.delete(`/api/containers/${created.body.id}`);

        expect(res.status).toBe(200);
        expect(res.body.msg).toBe("container deleted");
    });

    it("cannot update other tenant's container", async () => {
        // Create a container in tenant B
        const agentB = await loginAs(t.app, world.adminB.email, world.adminB.password);
        const created = await agentB.post("/api/containers").send({
            shipmentId: world.shipmentB.id,
            containerNumber: "BNLY1234567",
            type: "40ft",
        });

        // Try to update from tenant A
        const agentA = await loginAs(t.app, world.adminA.email, world.adminA.password);
        const res = await agentA.put(`/api/containers/${created.body.id}`).send({
            status: "loaded",
        });

        expect(res.status).toBe(403);
    });
});
