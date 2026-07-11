import type { en } from './en';

export const de: typeof en = {
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
    signOut: 'Abmelden'
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
    addWidget: 'Widget hinzufügen'
  }
};
