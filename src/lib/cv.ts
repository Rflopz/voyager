import { parse } from 'yaml';
import { readFileSync } from 'node:fs';

export interface ExperienceEntry {
  company: string;
  position: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  summary?: string;
  highlights: string[];
}

export interface ProjectEntry {
  name: string;
  summary?: string;
  highlights: string[];
}

export interface SkillGroup {
  label: string;
  details: string;
}

export interface SocialNetwork {
  network: string;
  username: string;
}

export interface CvData {
  name: string;
  headline: string;
  location: string;
  email: string;
  phone?: string;
  social_networks: SocialNetwork[];
  summary: string[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillGroup[];
}

const raw = readFileSync(new URL('../data/cv.yaml', import.meta.url), 'utf-8');
const parsed = parse(raw);

if (!parsed?.cv?.sections?.experience) {
  throw new Error(
    'cv.yaml is missing cv.sections.experience — check that scripts/sync-cv.mjs ran and the source RenderCV YAML schema has not changed.'
  );
}

export const cv: CvData = {
  name: parsed.cv.name,
  headline: parsed.cv.headline,
  location: parsed.cv.location,
  email: parsed.cv.email,
  phone: parsed.cv.phone,
  social_networks: parsed.cv.social_networks ?? [],
  summary: parsed.cv.sections.summary ?? [],
  experience: parsed.cv.sections.experience,
  projects: parsed.cv.sections.projects ?? [],
  skills: parsed.cv.sections.skills ?? [],
};
