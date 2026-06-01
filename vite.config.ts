// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only, disabled here for Vercel),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// Lovable "Publicar" builds for Cloudflare Workers (needs the default @cloudflare/vite-plugin on build).
// Vercel sets VERCEL=1 during build: use Nitro there only (not compatible with the CF worker output).
// Local Vercel-like build: `set VERCEL=1` (Win) or `VERCEL=1` (Unix) then `bun run build`.
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";
import { fileURLToPath, URL } from "node:url";

const deployVercel =
  process.env.VERCEL === "1" ||
  process.env.VERCEL === "true" ||
  process.env.DEPLOY_TARGET === "vercel";

export default defineConfig({
  ...(deployVercel
    ? { cloudflare: false as const, plugins: [nitro()] as const }
    : {}),
  vite: {
    resolve: {
      alias: {
        "firebase/auth": fileURLToPath(new URL("./src/lib/supabase-auth-compat.ts", import.meta.url)),
        "firebase/firestore": fileURLToPath(new URL("./src/lib/supabase-firestore-compat.ts", import.meta.url)),
        "firebase/storage": fileURLToPath(new URL("./src/lib/supabase-storage-compat.ts", import.meta.url)),
      },
    },
    server: {
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
    build: {
      rollupOptions: {
        output: {
        },
      },
    },
  },
});
