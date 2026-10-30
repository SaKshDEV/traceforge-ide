import express, { type Request, type Response } from "express";

const app = express();

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "127.0.0.1";

app.use(express.json({limit: "100kb"}));

app.get("/api/health",
    (_request: Request, response: Response) => {
        response.status(200).json({
            status: "ok",
            service: "traceforge-api",
            timeStamp:new Date().toISOString()
        });
    }
);

app.get("/", (_request: Request, response: Response) => {
    response.status(200).json({
        message: "TraceForge API is running",
        health: "/api/health"
    });
});

app.use((_request: Request,response:Response) => {
    response.status(404).json({
        error:{
            code: "NOT_FOUND",
            message: "Route not found"
        }
    });
});

app.listen(port, host, () => {
    console.log(`TraceForge api listening at http://${host}:${port}`);
});