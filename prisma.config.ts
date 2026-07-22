import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // On utilise DIRECT_URL en priorite pour eviter les problemes de PgBouncer lors du demarrage/migrations
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || env("DATABASE_URL"),
  },
});
