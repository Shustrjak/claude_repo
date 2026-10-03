/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  test: {
    // Adapter tests run in node; UI tests opt into jsdom with a `@vitest-environment jsdom` docblock.
    environment: "node",
    setupFiles: ["src/test/setup.ts"],
    // Alfa packages import their own CSS, so Vite must transform them.
    server: { deps: { inline: [/@alfalab\//] } },
  },
});
