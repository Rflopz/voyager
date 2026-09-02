import { getCv } from '../application/get-cv';
import { YamlCvRepository } from '../infrastructure/content/yaml-cv-repository';
import { join } from 'node:path';

/**
 * Composition root: the ONLY place that wires a concrete CvRepository
 * adapter into the getCv use case. Components/pages import `cv` from here —
 * never from infrastructure/ directly — so swapping the content source
 * later means changing this one file.
 */
const cvYamlPath = join(process.cwd(), 'src/data/cv.yaml');
const cvRepository = new YamlCvRepository(cvYamlPath);

export const cv = getCv(cvRepository);
