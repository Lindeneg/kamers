import {Router} from "express";
import type DataService from "../services/data-service";

export function makeHealthRouter(dataService: DataService) {
    const router = Router();

    // public
    router.get("/", async (_req, res) => {
        const dbResult = await dataService.checkHealth();
        if (!dbResult.ok) {
            // TODO get this into http exception
            res.status(503).json({status: "error", db: "unreachable"});
            return;
        }
        res.json({status: "ok"});
    });

    return router;
}
