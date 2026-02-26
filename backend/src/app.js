/**
 * src/app.js — Express app: middleware, routes, error handling.
 */
import express from "express";
import cors from "cors";
import asyncHandler from "express-async-handler";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import cyclistRoutes from "./routes/cyclistRoutes.js";
import hazardRoutes from "./routes/hazardRoutes.js";
import rewardRoutes from "./routes/rewardRoutes.js";
import tokenRoutes from "./routes/tokenRoutes.js";
import redeemRoutes from "./routes/redeemRoutes.js";
import partnerRoutes from "./routes/partnerRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { payhereNotify } from "./controllers/paymentController.js";
import { protect } from "./middleware/authMiddleware.js";
import { getRides } from "./controllers/cyclistController.js";
import { getCheckouts } from "./controllers/partnerController.js";

const allowedOrigins = [
  "http://localhost:5173",
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()) : []),
  ...(process.env.FRONTEND_ORIGIN && !process.env.CORS_ORIGIN ? [process.env.FRONTEND_ORIGIN] : []),
].filter(Boolean);

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) cb(null, true);
      else cb(null, false);
    },
    credentials: true,
  })
);
app.use("/api/payments/payhere/notify", express.urlencoded({ extended: true }), asyncHandler(payhereNotify));
app.use(express.json({ limit: "10mb" }));

/* ── Swagger UI ── */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.get("/api/cyclist/rides", protect, asyncHandler(getRides));
app.use("/api/cyclist", cyclistRoutes);
app.use("/api/hazards", hazardRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/tokens", tokenRoutes);
app.use("/api/redeem", redeemRoutes);
app.get("/api/partner/checkouts", protect, asyncHandler(getCheckouts));
app.use("/api/partner", partnerRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "CycleLink API is running" });
});

app.get("/api/admin-check", (req, res) => {
  res.json({ adminRoutesMounted: true, message: "Restart backend if admin panel still 404s" });
});

app.use(notFound);
app.use(errorHandler);

export default app;
