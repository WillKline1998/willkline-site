// Release types, in the order the Music filter shows them.
export const KIND_LABEL: Record<string, string> = {
  ALBUM: "Album",
  EP: "EP",
  COMPILATION: "Compilation",
  SINGLE: "Single",
  COMPOSITION: "Composition",
  PROJECT: "Project",
};

export const KIND_PLURAL: Record<string, string> = {
  ALBUM: "Albums",
  EP: "EPs",
  COMPILATION: "Compilations",
  SINGLE: "Singles",
  COMPOSITION: "Compositions",
  PROJECT: "Projects",
};

// Generic "no cover yet" art for releases without a cover (e.g. coming-soon albums). Setting Album.coverUrl replaces it.
export const PLACEHOLDER_COVER = "/covers/placeholder.png";
