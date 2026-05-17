import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./config/env.js";
import { handleError } from "./middleware/error-handler.js";
import { healthCheck } from "./controllers/interview.controller.js";
import { interviewRoutes } from "./routes/interview.routes.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: env.CORS_ORIGIN,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

app.get("/", (c) =>
  c.json({
    name: "InterviewPilot API",
    version: "0.1.0",
    agents: ["captain", "evaluator", "report"],
  })
);

app.get("/health", healthCheck);
app.route("/interview", interviewRoutes);

app.onError((err, c) => handleError(err, c));

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`InterviewPilot API running on http://localhost:${info.port}`);
  }
);
