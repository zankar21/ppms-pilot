// server/index.js
import express from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";

// Core routes
import dashboardRoutes from "./routes/dashboard.js";
import inventoryRoutes from "./routes/inventory.js";
import maintenanceRoutes from "./routes/maintenance.js";
import logbookRoutes from "./routes/logbook.js";
import masterRoutes from "./routes/masters.js";

// AI / Insights routes
import searchRoutes from "./routes/search.js";      // /api/search/semantic
import anomalyRoutes from "./routes/anomaly.js";    // /api/anomaly/...
import insightsRoutes from "./routes/insights.js";  // /api/insights/...

// Auth + Upload
import authRoutes, { requireAuth } from "./routes/auth.js";
import uploadRoutes from "./routes/upload.js";

// Jobs
import { scheduleDailyInsights /*, generateDailyInsightsNow */ } from "./jobs/dailyInsights.js";

const app = express();

/* ------------------------------ CORS ------------------------------ */
// Comma-separated list in env, e.g. "https://ppms.powerpulsetech.in, http://localhost:5173"
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// Explicit options so browser preflight (OPTIONS) never 405s
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow curl/postman/same-origin
    if (!allowedOrigins.length || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight for all routes

/* --------------------------- Middlewares -------------------------- */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

/* ------------------------------ Health --------------------------- */
app.get("/health", (_req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

/* --------------------------- Public Routes ------------------------ */
app.use("/api/auth", authRoutes); // POST /api/auth/login, etc.

/* ------------------------- Protected Routes ----------------------- */
// Read-only, safe for all authenticated roles
app.use("/api/dashboard",  requireAuth(["operator", "engineer", "admin"]), dashboardRoutes);
app.use("/api/masters",    requireAuth(["operator", "engineer", "admin"]), masterRoutes);

// Create/Update heavy routes — restrict to engineer/admin
app.use("/api/inventory",  requireAuth(["engineer", "admin"]), inventoryRoutes);
app.use("/api/maintenance",requireAuth(["engineer", "admin"]), maintenanceRoutes);

// Logbook: operators can write too (depending on route methods)
app.use("/api/logbook",    requireAuth(["operator", "engineer", "admin"]), logbookRoutes);

// AI / Insights
app.use("/api/search",     requireAuth(["operator", "engineer", "admin"]), searchRoutes);
app.use("/api/anomaly",    requireAuth(["operator", "engineer", "admin"]), anomalyRoutes);
app.use("/api/insights",   requireAuth(["operator", "engineer", "admin"]), insightsRoutes);

// Bulk CSV uploads — restrict to engineer/admin
app.use("/api/upload",     requireAuth(["engineer", "admin"]), uploadRoutes);

/* --------------------------- MongoDB Init ------------------------- */
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ppms";

mongoose
  .connect(MONGODB_URI, { autoIndex: true })
  .then(() => console.log("[DB] Connected"))
  .catch((err) => {
    console.error("[DB] Connection error:", err?.message || err);
    process.exit(1);
  });

/* ------------------------------ Jobs ------------------------------ */
scheduleDailyInsights();
// Optional: run once on boot
// generateDailyInsightsNow?.().catch(console.error);

/* ------------------------------ Server ---------------------------- */
const PORT = Number(process.env.PORT || 5000);

// Allow importing app for tests without starting HTTP server
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[API] Listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;
