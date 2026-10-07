// Shape of the CV shown on /cv (stored as JSON in SiteSetting "cv").
// Same shape as ~/JobSearch/resume/*.json, so one source feeds both.
export type CvEntry = { title: string; org: string; location: string; dates: string; note?: string; bullets: string[] };
export type Cv = {
  name: string;
  contact: string[];
  summary: string;
  experience: CvEntry[];
  additional_experience?: string;
  music: string[];
  education: { school: string; detail: string; location: string; dates: string }[];
  skills: [string, string][];
};
