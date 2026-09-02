import type { CvData } from './cv';

/**
 * Port for loading CV content. The application layer depends only on this
 * interface — never on YAML, the filesystem, or any specific data source.
 * Swapping RenderCV YAML for e.g. a CMS or JSON API later means writing one
 * new infrastructure/ adapter, not touching application/ or components/.
 */
export interface CvRepository {
  getCv(): CvData;
}
