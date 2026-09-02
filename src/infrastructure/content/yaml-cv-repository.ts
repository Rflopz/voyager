import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import type { CvRepository } from '../../domain/cv/cv-repository';
import type { CvData } from '../../domain/cv/cv';

/**
 * CvRepository adapter reading the RenderCV-format YAML synced from
 * ~/Dev/Rflopz/Docs/rendercv/ into src/data/cv.yaml (see scripts/sync-cv.mjs).
 *
 * This is the ONLY file in the codebase that knows the RenderCV YAML shape.
 * If the source schema changes, or the site moves to a different content
 * source entirely, only this file (and its constructor) needs to change —
 * application/ and components/ are unaffected because they only see CvData.
 */
export class YamlCvRepository implements CvRepository {
  private readonly filePath: string;

  /**
   * @param filePath Absolute path to the CV YAML file. Must be a plain
   *   path (not import.meta.url-relative) — Astro's SSG build moves
   *   compiled chunks into dist/.prerender/, which breaks relative URL
   *   resolution against the source tree at render time.
   */
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  getCv(): CvData {
    const raw = readFileSync(this.filePath, 'utf-8');
    const parsed = parse(raw);

    if (!parsed?.cv?.sections?.experience) {
      throw new Error(
        'cv.yaml is missing cv.sections.experience — check that scripts/sync-cv.mjs ran and the source RenderCV YAML schema has not changed.'
      );
    }

    return {
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
  }
}
