import { en } from './en';
import { de } from './de';

export type SupportedLanguage = 'en' | 'de';

export const dictionaries = {
  en,
  de
};

class I18nState {
  currentLang = $state<SupportedLanguage>('en');

  get t() {
    return dictionaries[this.currentLang];
  }

  setLang(lang: SupportedLanguage) {
    if (dictionaries[lang]) {
      this.currentLang = lang;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dashboard-lang', lang);
      }
    }
  }

  init() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('dashboard-lang') as SupportedLanguage;
      if (saved && dictionaries[saved]) {
        this.currentLang = saved;
      } else {
        const browserLang = navigator.language;
        if (browserLang.startsWith('de')) {
          this.currentLang = 'de';
        } else {
          this.currentLang = 'en';
        }
      }
    }
  }
}

// Global i18n singleton
export const i18n = new I18nState();
