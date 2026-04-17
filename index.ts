import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import prismaPlugin from "./utils/prisma-plugin.js";
import { recipientRoutes } from "./routes/recipients.js";
import { packageRoutes } from "./routes/packages.js";
import { binRoutes } from "./routes/bins.js";

const app = Fastify({ logger: true });

// Plugins
await app.register(cors, {
  origin: process.env.CLIENT_URL ?? "http://localhost:5173",
});
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
await app.register(prismaPlugin);

// Routes
await app.register(recipientRoutes);
await app.register(packageRoutes);
await app.register(binRoutes);

// Health check
app.get("/api/health", async () => ({ status: "ok" }));

// Start
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  console.log(`Server running at http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
