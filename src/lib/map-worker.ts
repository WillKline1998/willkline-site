import { setWorkerUrl } from "maplibre-gl";

let done = false;

/** Point MapLibre at its worker file (copied into /public by scripts/copy-map-worker.mjs). Safe to call from every map. */
export function configureMapWorker() {
  if (done) return;
  setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
  done = true;
}
