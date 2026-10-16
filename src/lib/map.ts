// Where the cleanup map gets its pictures and its street routes. Both are free public services run by the
// OpenStreetMap community, and both are used lightly (one request per tap, no autocomplete).
// If either ever goes away or says no, the page still works: the router falls back to straight lines.

/** OpenFreeMap (no key, no sign-up; OpenStreetMap data, OpenMapTiles schema). Attribution comes with the style. */
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/** The OpenStreetMap Germany community's walking-route service (OSRM, "foot" profile). Returns GeoJSON. */
export const FOOT_ROUTER = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";

/** Nominatim place search: one request when the person presses Go, never as they type. */
export const PLACE_SEARCH = "https://nominatim.openstreetmap.org/search";

export const ACCENT = "#c2410c";
