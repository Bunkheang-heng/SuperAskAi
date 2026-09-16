import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // The engine reads data/ from disk via lib/kb/loader. Node, not jsdom.
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Guardrails, curated matching and the glossary all resolve against the
    // real corpus. Keep the working directory at the repo root so that
    // getKb()'s join(process.cwd(), "data") resolves.
    root: process.cwd(),
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        // No runtime code — v8 reports 0% for a file of type declarations,
        // which is neither true nor actionable.
        "lib/types.ts",
        "lib/llm/provider.ts.d.ts",
        // Crawler and registry. Exercised by scripts/crawl.ts against live
        // government sites; a unit test of them would assert the shape of a
        // mock, not that monitoring works.
        "lib/crawl/**",
        "lib/registry/**",
        // Presentation constants — a palette and a copy table. Both are
        // asserted where they matter (lib/ui/copy.ts is covered through the
        // engine), and pinning hex values in a test blocks design changes
        // without catching a defect.
        "lib/ui/theme.ts",
      ],
      /**
       * A floor, not a target. Set just below the current numbers so an
       * ordinary change has room to move, but deleting a suite or landing a
       * substantial untested path fails the build rather than showing up as a
       * slowly sinking percentage nobody reads.
       *
       * The two provider adapters that are NOT the configured one —
       * lib/llm/anthropic.ts and lib/llm/vllm.ts — sit near 5%, which is what
       * holds the line here below 88. They are the Phase 1 migration targets
       * (NFR-18): worth covering when one of them becomes the provider in use,
       * not before.
       */
      thresholds: {
        lines: 85,
        statements: 85,
        branches: 90,
        functions: 90,
      },
    },
  },
});
