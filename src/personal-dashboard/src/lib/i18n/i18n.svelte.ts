import { en } from './en';
import { de } from './de';

export type SupportedLanguage = 'en' | 'de';

export const dictionaries = {
  en,
  de
};

class I18nState {
  currentLang = $state<SupportedLanguage>('en');
  dateFormat = $state<'auto' | 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'>('auto');
  timeFormat = $state<'auto' | '24h' | '12h'>('auto');

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

  setDateFormat(format: 'auto' | 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD') {
    this.dateFormat = format;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dashboard-date-format', format);
    }
  }

  setTimeFormat(format: 'auto' | '24h' | '12h') {
    this.timeFormat = format;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dashboard-time-format', format);
    }
  }

  init() {
    if (typeof localStorage !== 'undefined') {
      const savedLang = localStorage.getItem('dashboard-lang') as SupportedLanguage;
      if (savedLang && dictionaries[savedLang]) {
        this.currentLang = savedLang;
      } else {
        this.currentLang = 'en';
      }

      const savedDateFormat = localStorage.getItem('dashboard-date-format') as any;
      if (savedDateFormat) this.dateFormat = savedDateFormat;

      const savedTimeFormat = localStorage.getItem('dashboard-time-format') as any;
      if (savedTimeFormat) this.timeFormat = savedTimeFormat;
    }
  }

  get dateLocale() {
    if (this.dateFormat === 'DD.MM.YYYY') return 'de-DE';
    if (this.dateFormat === 'MM/DD/YYYY') return 'en-US';
    if (this.dateFormat === 'YYYY-MM-DD') return 'en-CA';
    return this.currentLang === 'de' ? 'de-DE' : 'en-US';
  }

  get timeLocale() {
    return this.currentLang === 'de' ? 'de-DE' : 'en-US';
  }

  get hour12() {
    if (this.timeFormat === '12h') return true;
    if (this.timeFormat === '24h') return false;
    return undefined;
  }

  formatDate(date: Date, style: 'short' | 'full' | 'year' = 'short') {
    let options: Intl.DateTimeFormatOptions = {};
    if (style === 'short') {
      options = { weekday: 'short', month: 'short', day: 'numeric' };
    } else if (style === 'full') {
      options = { weekday: 'short', month: 'long', day: 'numeric' };
    } else if (style === 'year') {
      options = { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' };
    }

    let str = date.toLocaleDateString(this.dateLocale, options);
    
    // In German, 'short' weekdays often have a dot (e.g. "Mo.", "Di."). We remove this dot to make it look cleaner, 
    // but keep dots for the day number (e.g. "1. Januar").
    // We replace the dot if it immediately follows the weekday abbreviation at the start.
    return str.replace(/^([a-zA-ZÄÖÜäöüß]+)\.,?/, '$1,');
  }

  formatTime(date: Date) {
    return date.toLocaleTimeString(this.timeLocale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: this.hour12
    });
  }
}

// Global i18n singleton
export const i18n = new I18nState();
