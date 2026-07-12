import type { en } from './en';

export const de: typeof en = {
legal: {
    impressum: {
      title: 'Impressum',
      info: 'Angaben gemäß § 5 DDG:',
      contact: 'Kontakt:',
    },
    datenschutz: {
      title: 'Datenschutzerklärung',
      sec1Title: '1. Datenschutz auf einen Blick',
      sec1Desc: 'Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.',
      sec2Title: '2. Datenerfassung auf dieser Website',
      sec2q1: 'Wer ist verantwortlich für die Datenerfassung?',
      sec2a1: 'Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber (siehe Impressum).',
      sec2q2: 'Wie erfassen wir Ihre Daten und auf welcher Rechtsgrundlage?',
      sec2a2: 'Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen (z. B. E-Mail-Adresse bei Registrierung, Dashboard-Einstellungen, API-Keys). Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Zudem erheben wir technische Daten (z.B. IP-Adressen) zur fehlerfreien Bereitstellung und Sicherheit der Website (Art. 6 Abs. 1 lit. f DSGVO).',
      sec2q3: 'Speicherdauer und API-Keys',
      sec2a3: 'Ihre Daten bleiben gespeichert, bis Sie Ihren Account löschen oder der Zweck der Datenverarbeitung entfällt. Hinterlegte API-Keys werden sicher in unserer Datenbank gespeichert und niemals für eigene Zwecke ausgelesen oder an Dritte weitergegeben.',
      sec3Title: '3. Betroffenenrechte (Ihre Rechte)',
      sec3Desc: 'Sie haben das Recht auf unentgeltliche Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten. Sie haben außerdem ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten sowie auf Datenübertragbarkeit. Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.',
      sec4Title: '4. Infrastruktur, Hosting & Drittanbieter',
      sec4Desc: 'Diese Website wird über Dienste wie Cloudflare (Hosting, Caching, Routing) ausgeliefert. Zur Datenbank-Speicherung und Authentifizierung nutzen wir Supabase. Bei jedem Aufruf der Website werden IP-Adressen durch diese Infrastruktur-Anbieter verarbeitet. Die Server von Supabase befinden sich i.d.R. in der EU (z.B. Frankfurt). Sollte es zu einem Datentransfer in Drittländer (z.B. USA) kommen, stützen sich diese Anbieter auf das EU-US Data Privacy Framework oder anerkannte Standardvertragsklauseln.',
      sec5Title: '5. Cookies',
      sec5Desc: 'Wir verwenden ausschließlich „technisch notwendige Cookies“ (Session-Cookies für den Login via Supabase), die zwingend erforderlich sind, um die Kernfunktionen bereitzustellen. Gemäß § 25 Abs. 2 TDDDG bzw. der ePrivacy-Richtlinie ist hierfür keine explizite Einwilligung (Cookie-Banner) erforderlich.'
    }
  },
  // Common
  save: 'Speichern',
  cancel: 'Abbrechen',
  edit: 'Bearbeiten',
  delete: 'Löschen',
  back: 'Zurück',
  settings: 'Einstellungen',

  // Login
  login: {
    welcomeBack: 'Willkommen zurück',
    createAccount: 'Account erstellen',
    signInDesc: 'Melde dich an, um dein Dashboard zu synchronisieren.',
    signUpDesc: 'Richte dein Cloud-Dashboard ein.',
    email: 'E-Mail',
    password: 'Passwort',
    forgotPassword: 'Passwort vergessen?',
    signInBtn: 'Anmelden',
    signUpBtn: 'Registrieren',
    signingIn: 'Wird angemeldet...',
    creating: 'Wird erstellt...',
    orContinueWith: 'oder weiter mit',
    alreadyHaveAccount: 'Du hast bereits einen Account?',
    dontHaveAccount: "Du hast noch keinen Account?",
    impressum: 'Impressum',
    datenschutz: 'Datenschutz'
  },

  // Reset Password
  resetPassword: {
    title: 'Passwort zurücksetzen',
    desc: 'Gib deine E-Mail-Adresse ein, um einen Reset-Link zu erhalten.',
    btn: 'Reset-Link senden',
    sending: 'Wird gesendet...',
    backToLogin: 'Zurück zur Anmeldung'
  },

  // Settings
  accountSettings: {
    title: 'Account-Einstellungen',
    desc: 'Verwalte deine Kontoeinstellungen und Sicherheit.',
    backToDash: 'Zurück zum Dashboard',
    changeEmail: 'E-Mail-Adresse ändern',
    currentEmail: 'Aktuelle E-Mail: {email}',
    newEmail: 'Neue E-Mail-Adresse',
    updateEmailBtn: 'E-Mail-Adresse aktualisieren',
    changePassword: 'Passwort ändern',
    passwordDesc: 'Stelle sicher, dass dein Konto ein langes, zufälliges Passwort verwendet.',
    newPassword: 'Neues Passwort',
    updatePasswordBtn: 'Passwort aktualisieren',
    signOut: 'Abmelden',
    currentPassword: 'Aktuelles Passwort',
    deleteAccount: 'Account löschen',
    deleteAccountDesc: 'Diese Aktion ist unwiderruflich. Alle deine Dashboards, Einstellungen und zugehörigen Daten werden endgültig gelöscht.',
    passwordToConfirm: 'Passwort zur Bestätigung',
    deleteAccountBtn: 'Account dauerhaft löschen',
    deleteAccountConfirm: 'Bist du sicher, dass du deinen Account und alle Daten unwiderruflich löschen möchtest?',
    language: 'Language / Sprache',
    tabAccount: 'Konto',
    tabAppearance: 'Darstellung',
    tabData: 'Daten'
  },

  // Dashboard Settings
  dashboardSettings: {
    title: 'Dashboard Einstellungen',
    accountCloud: 'Konto & Cloud',
    loggedIn: 'Angemeldet',
    localMode: 'Lokaler Modus',
    signInToSync: 'Melde dich an, um dein Dashboard zu synchronisieren.',
    logoutBtn: 'Abmelden',
    loginBtn: 'Anmelden',
    settingsBtn: 'Einstellungen',
    theme: 'Design',
    dataBackup: 'Daten & Backup',
    import: 'Importieren',
    importDesc: 'Aus Datei laden',
    export: 'Exportieren',
    exportDesc: 'In Datei speichern',
    addWidget: 'Widget hinzufügen',
    searchWidget: 'Widgets durchsuchen...'
  },

  // Integrations
  integrations: {
    title: 'Verbundene Konten',
    microsoftServices: 'Microsoft Dienste',
    connectedActive: 'Verbunden & Aktiv',
    notConnected: 'Nicht verbunden',
    unlink: 'Trennen',
    unlinking: 'Trennen...',
    reauthorize: 'Erneut autorisieren',
    loginWithMicrosoft: 'Mit Microsoft anmelden',
    unlinkConfirm: 'Möchtest du das Microsoft Konto wirklich trennen? Alle verbundenen Widgets werden die Verbindung verlieren.',
    unlinkError: 'Fehler beim Trennen des Kontos.'
  },

  // Todo Settings
  todoSettings: {
    title: 'Todo Einstellungen',
    deleteCompleted: 'Erledigte löschen',
    immediately: 'Sofort',
    after1h: 'Nach 1 Stunde',
    after24h: 'Nach 24 Stunden',
    never: 'Nie',
    yourWidgetUrl: 'Deine Widget-URL:',
    hideTutorial: 'Tutorial ausblenden',
    howToSetup: 'Wie richte ich das ein?',
    copied: 'Kopiert!',
    copy: 'Kopieren',
    urlLeaked: 'URL geleaked?',
    rotateUrl: 'URL Rotieren',
    tutorialIntro: 'Um deine Erinnerungen hier anzuzeigen, nutze unseren vorgefertigten iOS/macOS Kurzbefehl:',
    tutorialStep1: 'Lade den Kurzbefehl herunter:',
    installShortcut: 'Shortcut installieren',
    tutorialStep2: 'Öffne ihn in der Kurzbefehle-App und füge oben in das URL-Feld deine kopierte Widget-URL ein.',
    tutorialStep3: 'Führe den Kurzbefehl aus (oder erstelle eine Automation, die ihn regelmäßig ausführt).',
    connectAccount: 'Konto verbinden',
    connectAccountDesc: 'Verbinde dein Microsoft-Konto in den allgemeinen Dashboard-Einstellungen, um diese Funktion zu nutzen.',
    successfullyConnected: 'Erfolgreich verbunden',
    manageAccount: 'Konto verwalten',
    msSyncActive: 'Deine Aufgaben werden nun automatisch direkt über die Microsoft Graph API synchronisiert.'
  },

  // Widgets
  widgets: {
    searchbar: 'Suchleiste',
    favorites: 'Favoriten',
    note: 'Notizzettel',
    parcel: 'Paketverfolgung',
    trmnl: 'TRMNL Display',
    trmnlReminders: 'Apple Erinnerungen',
    clockWeatherDate: 'Uhr & Wetter',
    embed: 'Web-Embed',
    timerStopwatch: 'Timer / Stoppuhr',
    sketch: 'Whiteboard',
    colorPicker: 'Pipette / Farben',
    networkMetrics: 'Netzwerk Metriken',
    calendar: 'Kalender',
    stockTicker: 'Aktien',
    todo: 'To-Do Liste'
  },

  // Theme names
  themes: {
    default: 'Standard Dunkel',
    oled: 'OLED Schwarz',
    midnight: 'Mitternachtsblau',
    hacker: 'Hacker Grün',
    sunset: 'Purpur Sonnenuntergang',
    light: 'Modernes Hell',
    paper: 'Solarized Papier'
  },

  // Widget specific strings
  w: {
common: {
      cancel: 'Abbrechen',
      save: 'Speichern',
      close: 'Schließen',
      clickToCollapse: 'Klicken zum Einklappen',
      clickToReadMore: 'Klicken für mehr Details',
      copied: 'Kopiert!',
      configure: 'Konfigurieren',
      configureWidget: '{widget} konfigurieren',
      discardChanges: 'Änderungen verwerfen?',
      discardMsg: 'Sie haben ungespeicherte Änderungen. Möchten Sie diese wirklich verwerfen?',
      discard: 'Verwerfen',
      keepEditing: 'Weiter bearbeiten',
      loading: 'Lädt...',
      syncing: 'Synchronisiere...',
      error: 'Fehler',
      refresh: 'Aktualisieren',
      copy: 'Kopieren',
      copyDetails: 'Details kopieren',
      back: 'Zurück'
    },
    calendar: {
      title: 'Kalender',
      today: 'Heute',
      week: 'Woche',
      month: 'Kalender',
      noEvents: 'Keine anstehenden Termine.',
      noMoreEvents: 'Keine weiteren Termine heute.',
      noAdded: 'Noch keine Kalender hinzugefügt.',
      settings: 'Kalender Einstellungen',
      edit: 'Kalender bearbeiten',
      add: 'Kalender hinzufügen',
      remove: 'Kalender entfernen',
      namePlaceholder: 'Kalender Name (z.B. Arbeit)',
      urlPlaceholder: 'ICS URL (https://...)'
    },

    clock: {
      clock: 'Uhr',
      weather: 'Wetter',
      date: 'Datum',
      timeFormat: 'Zeitformat',
      temperature: 'Temperatur',
      generalInfo: 'Allgemeine Info Einstellungen'
    },
    embed: {
      webView: 'Web Ansicht',
      noUrl: 'Keine URL konfiguriert',
      setUrl: 'Quell-URL setzen',
      settings: 'Webview Einstellungen',
      label: 'Widget Titel',
      labelPlaceholder: 'z.B. Mein Kalender',
      sourceUrl: 'Quell-URL',
      urlPlaceholder: 'https://...',
      note: 'Hinweis: Manche Seiten blockieren das Einbetten (X-Frame-Options). Nutzen Sie "Einbetten" Links, falls verfügbar.'
    },
    favorites: {
      addBtn: 'Hinzufügen',
      urlPlaceholder: 'https://...',
      namePlaceholder: 'Name',
      edit: 'Favoriten bearbeiten'
    },
    parcel: {
      deliveries: 'Lieferungen',
      syncing: 'Synchronisiere...',
      addPackage: 'Paket hinzufügen',
      trackPackage: 'Paket verfolgen',
      noPackages: 'Keine {filterMode} Pakete.',
      active: 'Aktive',
      recent: 'Kürzliche',
      status: {
        delivered: 'Zugestellt',
        frozen: 'Eingefroren',
        inTransit: 'Unterwegs',
        ready: 'Abholbereit',
        outForDelivery: 'In Zustellung',
        notFound: 'Nicht gefunden',
        failed: 'Fehlversuch',
        exception: 'Ausnahme',
        infoReceived: 'Info erhalten',
        unknown: 'Unbekannt'
      },
      settings: 'Paketverfolgung Einstellungen',
      apiKey: 'API Schlüssel',
      displayFilter: 'Anzeigefilter',
      activePackages: 'Aktive Pakete',
      recentPackages: 'Kürzliche Pakete (Alle)'
    },
    stock: {
      stocks: 'Aktien',
      noTickers: 'Keine Ticker konfiguriert. Suchen Sie oben, um welche hinzuzufügen.',
      settings: 'Aktien-Ticker Einstellungen',
      targetCurrency: 'Zielwährung',
      activeTickers: 'Aktive Ticker',
      searchPlaceholder: 'Suche AAPL, BTC-USD...'
    },
    trmnl: {
      currentScreen: 'TRMNL Bildschirm',
      syncError: 'Sync-Fehler',
      settings: 'TRMNL Sync',
      webhookUrl: 'Webhook URL',
      apiKey: 'Benutzer API Schlüssel',
      deviceToken: 'Geräte Zugangs-Token',
      deviceId: 'Geräte ID',
      urlPlaceholder: 'https://trmnl.com/api/...',
      apiKeyPlaceholder: 'sk_...',
      tokenPlaceholder: '...',
      idPlaceholder: '...',
      instructions: 'Sie finden diese in Ihrem TRMNL-Dashboard unter "Developers". Verwenden Sie für die Webhook-URL Ihre Cloudflare-Domain, falls bereitgestellt.'
    },
network: {
      metrics: 'Netzwerk-Metriken',
      domReady: 'DOM Bereit',
      dom: 'DOM',
      ttfb: 'TTFB',
      load: 'Laden',
      totalLoad: 'Gesamtladezeit'
    },
    colorPicker: {
      title: 'Farbwähler',
      rgb: 'RGB',
      hex: 'HEX',
      visibility: 'Sichtbarkeit'
    },
    favorites: {
      addBtn: 'Hinzufügen',
      urlPlaceholder: 'https://...',
      namePlaceholder: 'Name',
      edit: 'Favoriten bearbeiten',
      noIcons: 'Keine Icons gefunden.'
    },
    sketch: {
      openSketch: 'Zeichnen',
      eraser: 'Radiergummi',
      pencil: 'Stift',
      text: 'Text',
      select: 'Auswählen',
      record: 'Aufnehmen'
    },
    trmnlReminders: {
      syncError: 'Sync-Fehler',
      webhookUrl: 'Webhook URL',
      urlPlaceholder: 'https://trmnl.com/api/...',
      apiKey: 'Benutzer API Schlüssel',
      apiKeyPlaceholder: 'sk_...',
      deviceToken: 'Geräte Zugangs-Token',
      tokenPlaceholder: '...',
      deviceId: 'Geräte ID',
      idPlaceholder: '...',
      instructions: 'Sie finden diese in Ihrem TRMNL-Dashboard unter "Developers".'
    },
    note: {
      placeholder: 'Schreibe etwas...',
      editMode: 'Bearbeiten',
      viewMode: 'Lesen'
    },
    search: {
      placeholder: 'Suchen, Rechnen, Konvertieren...',
      provider: 'Suchmaschine',
      webSearch: 'Web-Suche',
      calculate: 'Rechnen',
      convert: 'Konvertieren',
      calendar: 'Kalender',
      reminders: 'Erinnerungen',
      clearHistory: 'Verlauf leeren',
      badges: {
        CALC: 'RECHNEN',
        CONV: 'UMRECHNEN',
        HISTORY: 'VERLAUF',
        FAV: 'FAVORIT',
        WEB: 'WEB',
        WEATHER: 'WETTER',
        TIME: 'ZEIT',
        TRANSLATE: 'ÜBERSETZUNG',
        FACT: 'WISSEN',
        CALENDAR: 'KALENDER',
        REMINDER: 'ERINNERUNG'
      },
      subtitles: {
        recentSearch: 'Letzte Suche',
        searchHistory: 'Suchverlauf',
        copyToClipboard: 'In die Zwischenablage kopieren',
        suggestion: 'Vorschlag',
        readMore: 'Mehr lesen auf'
      }
    },
    timer: {
      timer: 'Timer',
      stopwatch: 'Stoppuhr',
      start: 'Start',
      pause: 'Pause',
      reset: 'Zurücksetzen'
    },
    weather: {
      city: 'Stadt',
      cityPlaceholder: 'z.B. Berlin',
      conditions: {
        clear: 'Klarer Himmel',
        mainlyClear: 'Weitgehend klar',
        foggy: 'Neblig',
        rainy: 'Regnerisch',
        snowy: 'Schneefall',
        thunderstorm: 'Gewitter'
      }
    },
    sketch: {
      openSketch: 'Zeichnen'
    },
    reminders: {
      title: 'Erinnerungen',
      overdue: 'Überfällig',
      today: 'Heute',
      planned: 'Geplant',
      noEvents: 'Keine Erinnerungen'
    }
  },

  // Error Page
  errorPage: {
    notFound: 'Huch! Da bist du wohl falsch abgebogen. Diese Seite ist wie ein unsichtbares Widget – sie existiert nicht.',
    generic: 'Ein unerwarteter Fehler ist aufgetreten.',
    backToDashboard: 'Zurück zum Dashboard'
  }
};
