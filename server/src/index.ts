import "dotenv/config";

import express from "express";
import healthRoutes from "./routes/health.routes.js";
import form4Routes from "./routes/form4.routes.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(express.json());

app.use("/health", healthRoutes);
app.use("/api/form4", form4Routes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
