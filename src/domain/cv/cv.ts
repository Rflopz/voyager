/**
 * Domain types for the CV/resume content. Pure data shapes — no framework,
 * no I/O. Mirrors the RenderCV YAML schema at the fields this site actually
 * consumes.
 */

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
