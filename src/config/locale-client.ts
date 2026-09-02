import { LocaleController } from '../application/locale-controller';
import { LocalStorageLocalePreferenceStore } from '../infrastructure/i18n/local-storage-locale-preference-store';
import { es } from '../infrastructure/i18n/es-translations';

let controllerInstance: LocaleController | null = null;

/**
 * Client-side composition root for the language-toggle feature. Same
 * singleton pattern as background-animation-client.ts — constructed once,
 * shared by every component that needs to read/set the locale.
 */
export function getLocaleController(): LocaleController {
  if (!controllerInstance) {
    controllerInstance = new LocaleController(new LocalStorageLocalePreferenceStore(), { es });
  }
  return controllerInstance;
}
