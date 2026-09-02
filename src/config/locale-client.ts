import { LocaleController } from '../application/locale-controller';
import { LocalePreferenceStorage } from '../infrastructure/i18n/storage/preferences';
import { LocalStorageAdapter } from '../infrastructure/storage/local-storage';
import { es } from '../infrastructure/i18n/es-translations';

let controllerInstance: LocaleController | null = null;

/**
 * Client-side composition root for the language-toggle feature. Same
 * singleton pattern as background-animation-client.ts — constructed once,
 * shared by every component that needs to read/set the locale, wiring the
 * concrete LocalStorageAdapter in as the KeyValueStorage mechanism.
 */
export function getLocaleController(): LocaleController {
  if (!controllerInstance) {
    controllerInstance = new LocaleController(new LocalePreferenceStorage(new LocalStorageAdapter()), { es });
  }
  return controllerInstance;
}
