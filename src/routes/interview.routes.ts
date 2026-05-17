import { Hono } from "hono";
import * as interviewController from "../controllers/interview.controller.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

const interviewRoutes = new Hono<{ Variables: AuthVariables }>();

interviewRoutes.use("/*", requireAuth);

interviewRoutes.post("/start", interviewController.startInterview);
interviewRoutes.post("/answer", interviewController.submitAnswer);
interviewRoutes.post("/end", interviewController.endInterview);
interviewRoutes.get("/history", interviewController.getHistory);
interviewRoutes.get("/:id", interviewController.getInterview);

// Streaming endpoints (SSE) for demo
interviewRoutes.get("/stream/captain", interviewController.streamCaptainQuestion);
interviewRoutes.get("/stream/report", interviewController.streamReport);

export { interviewRoutes };
