import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    reporters: "default",
    // Prisma s'initialise à l'import : URL factice, aucune requête n'est émise.
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "file:./data/test.db",
    },
  },
});
