import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false, // imports explicites — plus lisible
    // Bundle source de référence : ses tests s'exécutent depuis src/ après
    // copie et adaptation. Ne pas les collecter deux fois.
    exclude: ["**/node_modules/**", "**/dist/**", "portable-rci-cil/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
