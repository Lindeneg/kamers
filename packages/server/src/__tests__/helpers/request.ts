import supertest from "supertest";
import type {Express} from "express";

export async function loginAs(app: Express, email: string, password: string) {
    const agent = supertest.agent(app);
    await agent.post("/api/auth/login").send({email, password}).expect(200);
    return agent;
}
