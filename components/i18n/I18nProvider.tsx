'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { 
  I18nContext, 
  SupportedLanguage, 
  SUPPORTED_LANGUAGES,
  TranslationNamespaces,
  TranslationFunction,
  detectBrowserLanguage,
  getLanguageDirection,
  interpolateString
} from '../../lib/i18n';
import { enTranslations } from '../../lib/i18n/translations/en';
import { esTranslations } from '../../lib/i18n/translations/es';

// Translation registry
const translations: Record<SupportedLanguage, TranslationNamespaces> = {
  en: enTranslations,
  es: esTranslations,
  fr: enTranslations, // Fallback to English for now
  'zh-CN': enTranslations, // Fallback to English for now
  ar: enTranslations // Fallback to English for now
};

interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: SupportedLanguage;
}

export function I18nProvider({ children, defaultLanguage }: I18nProviderProps) {
  const [language, setLanguage] = useState<SupportedLanguage>(
    defaultLanguage || detectBrowserLanguage()
  );

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('jamalert-language') as SupportedLanguage;
    if (savedLanguage && savedLanguage in SUPPORTED_LANGUAGES) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language to localStorage and update document attributes
  useEffect(() => {
    localStorage.setItem('jamalert-language', language);
    
    // Update document language and direction
    document.documentElement.lang = language;
    document.documentElement.dir = getLanguageDirection(language);
    
    // Update document title if needed
    const currentTranslations = translations[language];
    if (currentTranslations) {
      // You can update the document title here if needed
    }
  }, [language]);

  const t: TranslationFunction = (namespace, key, params) => {
    const currentTranslations = translations[language];
    
    if (!currentTranslations || !currentTranslations[namespace]) {
      console.warn(`Translation namespace '${namespace}' not found for language '${language}'`);
      return `${namespace}.${String(key)}`;
    }

    const translation = currentTranslations[namespace][key as keyof typeof currentTranslations[typeof namespace]];
    
    if (!translation) {
      console.warn(`Translation key '${String(key)}' not found in namespace '${namespace}' for language '${language}'`);
      return `${namespace}.${String(key)}`;
    }

    if (params && typeof translation === 'string') {
      return interpolateString(translation, params);
    }

    return translation as string;
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat(language).format(value);
  };

  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return new Intl.DateTimeFormat(language, { ...defaultOptions, ...options }).format(date);
  };

  const formatCurrency = (value: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency
    }).format(value);
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
    
    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (diffInSeconds < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (diffInSeconds < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else if (diffInSeconds < 2592000) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    } else if (diffInSeconds < 31536000) {
      return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
    }
  };

  const value = {
    language,
    setLanguage,
    t,
    isRTL: SUPPORTED_LANGUAGES[language].rtl,
    formatNumber,
    formatDate,
    formatCurrency,
    formatRelativeTime
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

// Language selector component
export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage);
    setIsOpen(false);
    
    // Announce language change to screen readers
    const languageName = SUPPORTED_LANGUAGES[newLanguage].nativeName;
    const announcement = `Language changed to ${languageName}`;
    
    // Create temporary announcement element
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.textContent = announcement;
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  };

  const currentLanguage = SUPPORTED_LANGUAGES[language];

  return (
    <div className="language-selector">
      <button
        className="language-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Current language: ${currentLanguage.nativeName}. Click to change language`}
        title="Change Language"
      >
        <span className="language-flag" aria-hidden="true">
          {currentLanguage.flag}
        </span>
        <span className="language-name">
          {currentLanguage.nativeName}
        </span>
        <span className="language-chevron" aria-hidden="true">
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          className="language-selector-dropdown"
          role="listbox"
          aria-label="Select language"
        >
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => (
            <button
              key={code}
              className={`language-option ${code === language ? 'selected' : ''}`}
              role="option"
              aria-selected={code === language}
              onClick={() => handleLanguageChange(code as SupportedLanguage)}
              title={`Switch to ${info.name}`}
            >
              <span className="language-flag" aria-hidden="true">
                {info.flag}
              </span>
              <div className="language-info">
                <span className="language-native-name">
                  {info.nativeName}
                </span>
                <span className="language-english-name">
                  {info.name}
                </span>
              </div>
              {code === language && (
                <span className="language-selected-indicator" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Hook to use i18n (re-export for convenience)
export { useI18n } from '../../lib/i18n';

// Translation component for inline translations
interface TranslationProps {
  namespace: keyof TranslationNamespaces;
  keyName: string;
  params?: Record<string, string | number>;
  fallback?: string;
}

export function Translation({ namespace, keyName, params, fallback }: TranslationProps) {
  const { t } = useI18n();
  
  try {
    return <>{t(namespace, keyName as any, params)}</>;
  } catch (error) {
    console.warn(`Translation error: ${error}`);
    return <>{fallback || `${namespace}.${keyName}`}</>;
  }
}

// Higher-order component for translating components
export function withTranslation<P extends object>(
  Component: React.ComponentType<P & { t: TranslationFunction }>
) {
  return function TranslatedComponent(props: P) {
    const { t } = useI18n();
    return <Component {...props} t={t} />;
  };
}
