// MapLibre runs its heavy work in a Web Worker. Next's bundler can't find that file on its own, so it is
// copied into /public and the map is told where it is (src/lib/map.ts#useMapWorker). Runs after every install.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const from = "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs";
if (existsSync(from)) {
  mkdirSync("public/vendor", { recursive: true });
  copyFileSync(from, "public/vendor/maplibre-gl-worker.mjs");
}
