export const en = {
legal: {
    impressum: {
      title: 'Impressum',
      info: 'Information in accordance with § 5 DDG:',
      contact: 'Contact:',
    },
    datenschutz: {
      title: 'Privacy Policy',
      sec1Title: '1. Data protection at a glance',
      sec1Desc: 'We take the protection of your personal data very seriously. We treat your personal data confidentially and in accordance with the statutory data protection regulations and this privacy policy.',
      sec2Title: '2. Data collection on this website',
      sec2q1: 'Who is responsible for data collection?',
      sec2a1: 'Data processing on this website is carried out by the website operator (see Impressum).',
      sec2q2: 'How do we collect your data and on what legal basis?',
      sec2a2: 'Your data is collected when you provide it to us (e.g. email address during registration, dashboard settings, API keys). The processing is based on Art. 6 (1) (b) GDPR (fulfillment of contract). We also collect technical data (e.g. IP addresses) to ensure error-free provision and security of the website (Art. 6 (1) (f) GDPR).',
      sec2q3: 'Storage duration and API Keys',
      sec2a3: 'Your data remains stored until you delete your account or the purpose of the data processing ceases to apply. Provided API Keys are securely stored in our database and are never read for our own purposes or shared with third parties.',
      sec3Title: '3. Data subject rights (Your rights)',
      sec3Desc: 'You have the right to receive information about the origin, recipient, and purpose of your stored personal data free of charge. You also have the right to request the correction, blocking, or deletion of this data, as well as the right to data portability. Furthermore, you have the right to lodge a complaint with the competent supervisory authority.',
      sec4Title: '4. Infrastructure, Hosting & Third Parties',
      sec4Desc: 'This website is delivered via services like Cloudflare (hosting, caching, routing). We use Supabase for database storage and authentication. Whenever you visit the website, IP addresses are processed by these infrastructure providers. Supabase servers are generally located in the EU (e.g. Frankfurt). Should a data transfer to third countries (e.g. USA) occur, these providers rely on the EU-US Data Privacy Framework or recognized Standard Contractual Clauses.',
      sec5Title: '5. Cookies',
      sec5Desc: 'We exclusively use "technically necessary cookies" (session cookies for authentication via Supabase) that are strictly necessary to provide the core functions. In accordance with § 25 Para. 2 TDDDG and the ePrivacy Directive, no explicit consent (Cookie Banner) is required for these cookies.'
    }
  },
  // Common
  save: 'Save',
  cancel: 'Cancel',
  edit: 'Edit',
  delete: 'Delete',
  back: 'Back',
  settings: 'Settings',

  // Login
  login: {
    welcomeBack: 'Welcome Back',
    createAccount: 'Create Account',
    signInDesc: 'Sign in to sync your dashboard.',
    signUpDesc: 'Set up your cloud dashboard.',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    signInBtn: 'Sign In',
    signUpBtn: 'Sign Up',
    signingIn: 'Signing in...',
    creating: 'Creating...',
    orContinueWith: 'or continue with',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    impressum: 'Impressum',
    datenschutz: 'Privacy'
  },

  // Reset Password
  resetPassword: {
    title: 'Reset Password',
    desc: 'Enter your email to receive a reset link.',
    btn: 'Send Reset Link',
    sending: 'Sending...',
    backToLogin: 'Back to sign in'
  },

  // Settings
  accountSettings: {
    title: 'Account Settings',
    desc: 'Manage your account preferences and security.',
    backToDash: 'Back to Dashboard',
    changeEmail: 'Change Email',
    currentEmail: 'Current email: {email}',
    newEmail: 'New Email',
    updateEmailBtn: 'Update Email',
    changePassword: 'Change Password',
    passwordDesc: 'Ensure your account is using a long, random password.',
    newPassword: 'New Password',
    updatePasswordBtn: 'Update Password',
    signOut: 'Sign Out',
    currentPassword: 'Current Password',
    deleteAccount: 'Delete Account',
    deleteAccountDesc: 'This action is irreversible. All your dashboards, settings, and associated data will be permanently deleted.',
    passwordToConfirm: 'Password to confirm',
    deleteAccountBtn: 'Delete Account Permanently',
    deleteAccountConfirm: 'Are you sure you want to permanently delete your account and all data?',
    language: 'Language / Sprache',
    tabAccount: 'Account',
    tabAppearance: 'Appearance',
    tabData: 'Data',
    dateFormat: 'Date Format',
    timeFormat: 'Time Format',
    formatAuto: 'Auto (Language Default)'
  },

  // Dashboard Settings
  dashboardSettings: {
    title: 'Dashboard Settings',
    accountCloud: 'Account & Cloud',
    loggedIn: 'Logged in',
    localMode: 'Local Mode',
    signInToSync: 'Sign in to sync your dashboard.',
    logoutBtn: 'Logout',
    loginBtn: 'Login',
    settingsBtn: 'Settings',
    theme: 'Theme',
    dataBackup: 'Data & Backup',
    import: 'Import',
    importDesc: 'Load from file',
    export: 'Export',
    exportDesc: 'Save to file',
    addWidget: 'Add Widget',
    searchWidget: 'Search widgets...'
  },

  // Integrations
  integrations: {
    title: 'Connected Accounts',
    microsoftServices: 'Microsoft Services',
    connectedActive: 'Connected & Active',
    notConnected: 'Not connected',
    unlink: 'Unlink',
    unlinking: 'Unlinking...',
    reauthorize: 'Reauthorize',
    loginWithMicrosoft: 'Sign in with Microsoft',
    unlinkConfirm: 'Are you sure you want to unlink your Microsoft account? All connected widgets will lose their connection.',
    unlinkError: 'Error unlinking account.'
  },

  // Todo Settings
  todoSettings: {
    title: 'Todo Settings',
    deleteCompleted: 'Delete completed',
    immediately: 'Immediately',
    after1h: 'After 1 hour',
    after24h: 'After 24 hours',
    never: 'Never',
    sortSameDay: 'Same day sorted by',
    time: 'Time',
    priority: 'Priority',
    yourWidgetUrl: 'Your Widget URL:',
    hideTutorial: 'Hide Tutorial',
    howToSetup: 'How do I set this up?',
    copied: 'Copied!',
    copy: 'Copy',
    urlLeaked: 'URL leaked?',
    rotateUrl: 'Rotate URL',
    tutorialIntro: 'To display your reminders here, use our pre-made iOS/macOS Shortcut:',
    tutorialStep1: 'Download the shortcut:',
    installShortcut: 'Install Shortcut',
    tutorialStep2: 'Open it in the Shortcuts app and paste your copied Widget URL into the URL field at the top.',
    tutorialStep3: 'Run the shortcut (or create an automation to run it regularly).',
    connectAccount: 'Connect Account',
    connectAccountDesc: 'Connect your Microsoft account in the general Dashboard settings to use this feature.',
    successfullyConnected: 'Successfully connected',
    manageAccount: 'Manage Account',
    msSyncActive: 'Your tasks are now automatically synchronized directly via the Microsoft Graph API.'
  },

  // Widgets
  widgets: {
    searchbar: 'Searchbar',
    favorites: 'Favorites',
    note: 'Sticky Note',
    parcel: 'Parcel Tracker',
    trmnl: 'TRMNL Current Screen',
    trmnlReminders: 'Apple Reminders',
    clockWeatherDate: 'Clock & Weather',
    embed: 'Web Embed',
    timerStopwatch: 'Timer / Stopwatch',
    sketch: 'Whiteboard',
    colorPicker: 'Color Picker',
    networkMetrics: 'Network Metrics',
    calendar: 'Calendar',
    stockTicker: 'Stocks',
    todo: 'To-Do List',
    clipboardSync: 'Clipboard Sync'
  },

  // Theme names
  themes: {
    default: 'Default Dark',
    oled: 'OLED Black',
    midnight: 'Midnight Blue',
    hacker: 'Forest Green',
    sunset: 'Crimson Sunset',
    light: 'Modern Light',
    paper: 'Solarized Paper',
    princess: 'Princess Pink'
  },

  // Widget specific strings
  w: {
common: {
      name: 'Name',
      cancel: 'Cancel',
      save: 'Save',
      close: 'Close',
      clickToCollapse: 'Click to collapse',
      clickToReadMore: 'Click to read more',
      copied: 'Copied!',
      configure: 'Configure',
      configureWidget: 'Configure {widget}',
      discardChanges: 'Discard Changes?',
      discardMsg: 'You have unsaved changes. Are you sure you want to discard them?',
      discard: 'Discard',
      keepEditing: 'Keep Editing',
      loading: 'Loading...',
      syncing: 'Syncing...',
      error: 'Error',
      refresh: 'Refresh',
      copy: 'Copy',
      copyDetails: 'Copy details',
      back: 'Back'
    },
    workspaces: {
      editWorkspace: 'Edit Workspace',
      theme: 'Theme',
      workspaceFallback: 'Workspace',
      newWorkspace: 'Workspace {num}',
      deleteOnlyError: 'You cannot delete your only workspace.',
      deleteCurrentError: 'Please switch to another workspace before deleting this one.',
      deleteConfirm: 'Are you sure you want to delete this workspace?'
    },
    calendar: {
      title: 'Calendar',
      today: 'Today',
      week: 'Week',
      month: 'Calendars',
      noEvents: 'No upcoming events.',
      noMoreEvents: 'No more events today.',
      noAdded: 'No calendars added yet.',
      settings: 'Calendar Settings',
      edit: 'Edit Calendar',
      add: 'Add Calendar',
      remove: 'Remove Calendar',
      namePlaceholder: 'Calendar Name (e.g. Work)',
      urlPlaceholder: 'ICS URL (https://...)'
    },
    clock: {
      clock: 'Clock',
      weather: 'Weather',
      date: 'Date',
      timeFormat: 'Time Format',
      temperature: 'Temperature',
      generalInfo: 'General Info Settings'
    },
    embed: {
      webView: 'Web View',
      noUrl: 'No URL Configured',
      setUrl: 'Set Source URL',
      settings: 'Webview Settings',
      label: 'Widget Label',
      labelPlaceholder: 'e.g. My Calendar',
      sourceUrl: 'Source URL',
      urlPlaceholder: 'https://...',
      note: 'Note: Some sites block being embedded (X-Frame-Options). Use "Embed" links where available.'
    },
    favorites: {
      addBtn: 'Add',
      urlPlaceholder: 'https://...',
      namePlaceholder: 'Name',
      edit: 'Edit Favorites'
    },
    parcel: {
      deliveries: 'Deliveries',
      syncing: 'Syncing...',
      addPackage: 'Add Package',
      trackPackage: 'Track Package',
      noPackages: 'No {filterMode} packages.',
      active: 'Active',
      recent: 'Recent',
      status: {
        delivered: 'Delivered',
        frozen: 'Frozen',
        inTransit: 'In Transit',
        ready: 'Ready for Pickup',
        outForDelivery: 'Out for Delivery',
        notFound: 'Not Found',
        failed: 'Failed Attempt',
        exception: 'Exception',
        infoReceived: 'Info Received',
        unknown: 'Unknown'
      },
      settings: 'Parcel Track Settings',
      apiKey: 'API Key',
      displayFilter: 'Display Filter',
      activePackages: 'Active Packages',
      recentPackages: 'Recent Packages (All)'
    },
    stock: {
      stocks: 'Stocks',
      noTickers: 'No tickers configured. Search above to add some.',
      settings: 'Stock Ticker Settings',
      targetCurrency: 'Target Currency',
      activeTickers: 'Active Tickers',
      searchPlaceholder: 'Search AAPL, BTC-USD...'
    },
    trmnl: {
      currentScreen: 'TRMNL Screen',
      syncError: 'Sync Error',
      settings: 'TRMNL Sync',
      webhookUrl: 'Webhook URL',
      apiKey: 'User API Key',
      deviceToken: 'Device Access Token',
      deviceId: 'Device ID',
      urlPlaceholder: 'https://trmnl.com/api/...',
      apiKeyPlaceholder: 'sk_...',
      tokenPlaceholder: '...',
      idPlaceholder: '...',
      instructions: 'You can find these in your TRMNL dashboard under developers. For Webhook URL use your cloudflare domain if you have deployed this.'
    },
network: {
      metrics: 'Network Metrics',
      domReady: 'DOM Ready',
      dom: 'DOM',
      ttfb: 'TTFB',
      load: 'Load',
      totalLoad: 'Total Load'
    },
    colorPicker: {
      title: 'Color Picker',
      rgb: 'RGB',
      hex: 'HEX',
      visibility: 'Visibility'
    },
    favorites: {
      addBtn: 'Add',
      urlPlaceholder: 'https://...',
      namePlaceholder: 'Name',
      edit: 'Edit Favorites',
      noIcons: 'No icons found.'
    },
    sketch: {
      openSketch: 'Draw',
      eraser: 'Eraser',
      pencil: 'Pencil',
      text: 'Text',
      select: 'Select',
      record: 'Record'
    },
    trmnlReminders: {
      syncError: 'Sync Error',
      webhookUrl: 'Webhook URL',
      urlPlaceholder: 'https://trmnl.com/api/...',
      apiKey: 'User API Key',
      apiKeyPlaceholder: 'sk_...',
      deviceToken: 'Device Access Token',
      tokenPlaceholder: '...',
      deviceId: 'Device ID',
      idPlaceholder: '...',
      instructions: 'You can find these in your TRMNL dashboard under developers.'
    },
    note: {
      placeholder: 'Write something...',
      editMode: 'Edit',
      viewMode: 'View'
    },
    search: {
      placeholder: 'Search, Calculate, Convert...',
      provider: 'Search Provider',
      webSearch: 'Web Search',
      calculate: 'Calculate',
      convert: 'Convert',
      calendar: 'Calendar',
      reminders: 'Reminders',
      clearHistory: 'Clear History',
      badges: {
        CALC: 'CALC',
        CONV: 'CONV',
        HISTORY: 'HISTORY',
        FAV: 'FAV',
        WEB: 'WEB',
        WEATHER: 'WEATHER',
        TIME: 'TIME',
        TRANSLATE: 'TRANSLATE',
        FACT: 'FACT',
        CALENDAR: 'CALENDAR',
        REMINDER: 'REMINDER'
      },
      subtitles: {
        recentSearch: 'Recent Search',
        searchHistory: 'Search History',
        copyToClipboard: 'Copy to clipboard',
        suggestion: 'Suggestion',
        readMore: 'Read more on'
      }
    },
    timer: {
      timer: 'Timer',
      stopwatch: 'Stopwatch',
      start: 'Start',
      pause: 'Pause',
      reset: 'Reset'
    },
    weather: {
      city: 'City',
      cityPlaceholder: 'e.g. London',
      conditions: {
        clear: 'Clear sky',
        mainlyClear: 'Mainly clear',
        foggy: 'Foggy',
        rainy: 'Rainy',
        snowy: 'Snowy',
        thunderstorm: 'Thunderstorm'
      }
    },
    sketch: {
      openSketch: 'Draw'
    },
    reminders: {
      title: 'Reminders',
      overdue: 'Overdue',
      today: 'Today',
      planned: 'Planned',
      noEvents: 'No Reminders'
    },
    clipboardSync: {
      uploadLocal: 'Upload Local Clipboard',
      copyCloud: 'Copy from Cloud',
      success: 'Success',
      error: 'Error',
      upload: 'Upload',
      copy: 'Copy',
      empty: 'Empty',
      dropHere: 'Drop here',
      snippet: 'Text Snippet',
      expiresIn: 'Expires in {h}h {m}m',
      expired: 'Expired',
      share: 'Create Quickshare'
    }
  },

  // Error Page
  errorPage: {
    notFound: "Oops! Looks like you took a wrong turn. This page is like an invisible widget – it doesn't exist.",
    generic: 'An unexpected error has occurred.',
    backToDashboard: 'Back to Dashboard'
  }
};
