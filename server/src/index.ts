import "dotenv/config";
import { verifyUser } from "./middleware/auth.middleware.js";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import form4Routes from "./routes/form4.routes.js";

import watchlistRoutes from "./routes/watchlist.routes.js";
import feedRoutes from "./routes/feed.routes.js";
import { startScheduler } from "./services/scheduler.service.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/health", healthRoutes);
app.use("/api", form4Routes);
app.use("/auth", authRoutes);

app.use("/api/watchlist", verifyUser, watchlistRoutes);
app.use("/api/feed", feedRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

startScheduler(); // add this
