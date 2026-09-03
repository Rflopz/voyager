import type { Translations } from '../../domain/i18n/translations';

/**
 * Spanish translations, keyed by the same `data-i18n` attribute values
 * used in markup. Only static UI chrome + hand-authored prose is
 * translated — CV content (experience, projects, skills) comes from
 * cv.yaml, which has no i18n fields, so it stays English in both locales.
 */
export const es: Translations = {
  navGithub: 'GITHUB',
  navLinkedin: 'LINKEDIN',
  navEmail: 'CORREO',
  secAbout: 'SOBRE MÍ',
  secWork: 'TRABAJO SELECCIONADO',
  secWriting: 'ESCRITOS',
  secExp: 'EXPERIENCIA',
  secContact: 'CONTACTO',
  nowLabel: 'AHORA',
  personalProject: 'PROYECTO PERSONAL',
  viewProject: 'VER PROYECTO',
  writingEmpty: 'Aún no hay artículos publicados.',
  scrollCue: 'DESPLÁZATE',
  footNote: 'CONSTRUIDO A MANO',
};
