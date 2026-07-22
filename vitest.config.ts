import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false, // imports explicites — plus lisible
    // Bundle source de référence : ses tests s'exécutent depuis src/ après
    // copie et adaptation. Ne pas les collecter deux fois.
    //
    // `.next/**` et `.claude/**` contiennent des copies figées du code (sortie
    // standalone du build, worktrees d'agents) : les collecter fait échouer la
    // suite sur du code obsolète qui n'est plus la source de vérité.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "portable-rci-cil/**",
      ".next/**",
      ".claude/**",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
