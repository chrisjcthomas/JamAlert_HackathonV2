import { createContext, useContext } from 'react';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    rtl: false
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    rtl: false
  },
  'zh-CN': {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    flag: '🇨🇳',
    rtl: false
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    rtl: true
  }
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;
export type LanguageInfo = typeof SUPPORTED_LANGUAGES[SupportedLanguage];

// Translation namespace structure
export interface TranslationNamespaces {
  common: CommonTranslations;
  navigation: NavigationTranslations;
  alerts: AlertTranslations;
  incidents: IncidentTranslations;
  auth: AuthTranslations;
  dashboard: DashboardTranslations;
  accessibility: AccessibilityTranslations;
  errors: ErrorTranslations;
}

export interface CommonTranslations {
  loading: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  cancel: string;
  confirm: string;
  save: string;
  delete: string;
  edit: string;
  view: string;
  close: string;
  back: string;
  next: string;
  previous: string;
  submit: string;
  reset: string;
  search: string;
  filter: string;
  sort: string;
  refresh: string;
  export: string;
  import: string;
  print: string;
  share: string;
  copy: string;
  download: string;
  upload: string;
  yes: string;
  no: string;
  ok: string;
  required: string;
  optional: string;
  select: string;
  selectAll: string;
  deselectAll: string;
  noResults: string;
  noData: string;
  page: string;
  of: string;
  showing: string;
  results: string;
  total: string;
}

export interface NavigationTranslations {
  home: string;
  alerts: string;
  incidents: string;
  dashboard: string;
  profile: string;
  settings: string;
  help: string;
  about: string;
  contact: string;
  login: string;
  logout: string;
  register: string;
  menu: string;
  mainNavigation: string;
  breadcrumb: string;
  skipToContent: string;
  skipToNavigation: string;
  skipToFooter: string;
}

export interface AlertTranslations {
  title: string;
  newAlert: string;
  alertType: string;
  severity: string;
  message: string;
  parishes: string;
  emergencyOnly: string;
  sendAlert: string;
  scheduleAlert: string;
  alertHistory: string;
  activeAlerts: string;
  expiredAlerts: string;
  draftAlerts: string;
  alertSent: string;
  alertScheduled: string;
  alertFailed: string;
  deliveryStatus: string;
  recipients: string;
  channels: string;
  email: string;
  sms: string;
  push: string;
  webhook: string;
  types: {
    flood: string;
    hurricane: string;
    earthquake: string;
    fire: string;
    accident: string;
    weather: string;
    emergency: string;
    health: string;
    security: string;
    other: string;
  };
  severities: {
    low: string;
    medium: string;
    high: string;
    critical: string;
  };
}

export interface IncidentTranslations {
  title: string;
  reportIncident: string;
  incidentType: string;
  description: string;
  location: string;
  parish: string;
  severity: string;
  anonymous: string;
  reporterInfo: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  submitReport: string;
  incidentReported: string;
  incidentHistory: string;
  pendingReports: string;
  approvedReports: string;
  rejectedReports: string;
  underInvestigation: string;
  status: string;
  verificationStatus: string;
  adminNotes: string;
  reviewReport: string;
  approveReport: string;
  rejectReport: string;
  statuses: {
    pending: string;
    approved: string;
    rejected: string;
    investigating: string;
  };
  verificationStatuses: {
    unverified: string;
    verified: string;
    falseReport: string;
  };
}

export interface AuthTranslations {
  login: string;
  logout: string;
  register: string;
  forgotPassword: string;
  resetPassword: string;
  changePassword: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  parish: string;
  emailAlerts: string;
  smsAlerts: string;
  emergencyOnly: string;
  createAccount: string;
  signIn: string;
  signOut: string;
  welcomeBack: string;
  accountCreated: string;
  passwordReset: string;
  invalidCredentials: string;
  accountExists: string;
  weakPassword: string;
  passwordMismatch: string;
  invalidEmail: string;
  requiredField: string;
}

export interface DashboardTranslations {
  title: string;
  overview: string;
  statistics: string;
  recentAlerts: string;
  recentIncidents: string;
  systemHealth: string;
  userActivity: string;
  alertsSent: string;
  incidentsReported: string;
  activeUsers: string;
  systemStatus: string;
  healthy: string;
  warning: string;
  critical: string;
  offline: string;
  lastUpdated: string;
  refreshData: string;
  viewAll: string;
  quickActions: string;
  sendAlert: string;
  viewReports: string;
  manageUsers: string;
  systemSettings: string;
}

export interface AccessibilityTranslations {
  title: string;
  settings: string;
  visualSettings: string;
  motionSettings: string;
  navigationSettings: string;
  highContrast: string;
  highContrastDesc: string;
  largeText: string;
  largeTextDesc: string;
  fontSize: string;
  fontSizeDesc: string;
  theme: string;
  themeDesc: string;
  reducedMotion: string;
  reducedMotionDesc: string;
  keyboardNavigation: string;
  keyboardNavigationDesc: string;
  screenReaderMode: string;
  screenReaderModeDesc: string;
  keyboardShortcuts: string;
  resetToDefaults: string;
  settingsReset: string;
  settingEnabled: string;
  settingDisabled: string;
  controlsOpened: string;
  controlsClosed: string;
  skipToContent: string;
  skipToNavigation: string;
  skipToFooter: string;
  closeDialog: string;
  fontSizes: {
    small: string;
    medium: string;
    large: string;
    extraLarge: string;
  };
  themes: {
    light: string;
    dark: string;
    highContrast: string;
  };
}

export interface ErrorTranslations {
  pageNotFound: string;
  serverError: string;
  networkError: string;
  unauthorized: string;
  forbidden: string;
  validationError: string;
  unknownError: string;
  tryAgain: string;
  goHome: string;
  contactSupport: string;
  errorBoundary: string;
  somethingWentWrong: string;
  reloadPage: string;
  reportError: string;
}

// Translation function type
export type TranslationFunction = <T extends keyof TranslationNamespaces>(
  namespace: T,
  key: keyof TranslationNamespaces[T],
  params?: Record<string, string | number>
) => string;

// I18n context type
export interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: TranslationFunction;
  isRTL: boolean;
  formatNumber: (value: number) => string;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (value: number, currency?: string) => string;
  formatRelativeTime: (date: Date) => string;
}

// Create context
export const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Hook to use i18n
export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Utility functions
export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';
  
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  
  // Check for exact match
  if (browserLang in SUPPORTED_LANGUAGES) {
    return browserLang as SupportedLanguage;
  }
  
  // Check for language code match (e.g., 'en-US' -> 'en')
  const langCode = browserLang.split('-')[0];
  if (langCode in SUPPORTED_LANGUAGES) {
    return langCode as SupportedLanguage;
  }
  
  return 'en';
}

export function getLanguageDirection(language: SupportedLanguage): 'ltr' | 'rtl' {
  return SUPPORTED_LANGUAGES[language].rtl ? 'rtl' : 'ltr';
}

export function interpolateString(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key]?.toString() || match;
  });
}
