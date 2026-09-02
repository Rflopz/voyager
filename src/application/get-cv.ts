import type { CvData } from '../domain/cv';
import type { CvRepository } from '../domain/cv-repository';

/**
 * Use case: fetch the CV content to render on the site.
 * Depends only on the CvRepository port (dependency inversion) — components
 * import this, never an infrastructure adapter directly.
 */
export function getCv(repository: CvRepository): CvData {
  return repository.getCv();
}
