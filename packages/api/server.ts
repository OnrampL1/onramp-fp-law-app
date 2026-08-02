import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { connectTokenBlacklist, getPrismaClient } from "@starter-kit/shared";
import { app } from "./app";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

async function start(): Promise<void> {
  try {
    await getPrismaClient().$connect();
    console.info("Database connection established");

    await connectTokenBlacklist();
    console.info("Token blacklist connection established");

    app.listen(PORT, () => {
      console.info(`API server running on http://localhost:${PORT}`);
      console.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
