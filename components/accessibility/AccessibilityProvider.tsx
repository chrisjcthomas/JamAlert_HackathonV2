'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  theme: 'light' | 'dark' | 'high-contrast';
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  resetSettings: () => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  screenReaderMode: false,
  keyboardNavigation: true,
  fontSize: 'medium',
  theme: 'light'
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [announcer, setAnnouncer] = useState<HTMLElement | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('jamalert-accessibility-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.warn('Failed to parse accessibility settings:', error);
      }
    }

    // Detect system preferences
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

    setSettings(prev => ({
      ...prev,
      theme: prefersDark ? 'dark' : 'light',
      reducedMotion: prefersReducedMotion,
      highContrast: prefersHighContrast
    }));

    // Create screen reader announcer
    const announcerElement = document.createElement('div');
    announcerElement.setAttribute('aria-live', 'polite');
    announcerElement.setAttribute('aria-atomic', 'true');
    announcerElement.setAttribute('aria-relevant', 'text');
    announcerElement.style.position = 'absolute';
    announcerElement.style.left = '-10000px';
    announcerElement.style.width = '1px';
    announcerElement.style.height = '1px';
    announcerElement.style.overflow = 'hidden';
    document.body.appendChild(announcerElement);
    setAnnouncer(announcerElement);

    return () => {
      if (announcerElement.parentNode) {
        announcerElement.parentNode.removeChild(announcerElement);
      }
    };
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('jamalert-accessibility-settings', JSON.stringify(settings));
    applyAccessibilitySettings(settings);
  }, [settings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('jamalert-accessibility-settings');
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcer) {
      announcer.setAttribute('aria-live', priority);
      announcer.textContent = message;
      
      // Clear the message after a short delay to allow for re-announcements
      setTimeout(() => {
        announcer.textContent = '';
      }, 1000);
    }
  };

  const value: AccessibilityContextType = {
    settings,
    updateSetting,
    resetSettings,
    announceToScreenReader
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

function applyAccessibilitySettings(settings: AccessibilitySettings) {
  const root = document.documentElement;

  // Apply theme
  root.setAttribute('data-theme', settings.theme);

  // Apply high contrast
  if (settings.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }

  // Apply large text
  if (settings.largeText) {
    root.classList.add('large-text');
  } else {
    root.classList.remove('large-text');
  }

  // Apply reduced motion
  if (settings.reducedMotion) {
    root.classList.add('reduced-motion');
  } else {
    root.classList.remove('reduced-motion');
  }

  // Apply font size
  root.setAttribute('data-font-size', settings.fontSize);

  // Apply keyboard navigation styles
  if (settings.keyboardNavigation) {
    root.classList.add('keyboard-navigation');
  } else {
    root.classList.remove('keyboard-navigation');
  }

  // Apply screen reader mode
  if (settings.screenReaderMode) {
    root.classList.add('screen-reader-mode');
  } else {
    root.classList.remove('screen-reader-mode');
  }
}

// Hook for keyboard navigation
export function useKeyboardNavigation() {
  const { settings } = useAccessibility();

  useEffect(() => {
    if (!settings.keyboardNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip links functionality
      if (event.key === 'Tab' && event.shiftKey && event.ctrlKey) {
        event.preventDefault();
        const skipLink = document.querySelector('[data-skip-link]') as HTMLElement;
        if (skipLink) {
          skipLink.focus();
        }
      }

      // Escape key to close modals/dropdowns
      if (event.key === 'Escape') {
        const activeModal = document.querySelector('[role="dialog"][aria-hidden="false"]') as HTMLElement;
        if (activeModal) {
          const closeButton = activeModal.querySelector('[data-close]') as HTMLElement;
          if (closeButton) {
            closeButton.click();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboardNavigation]);
}

// Hook for focus management
export function useFocusManagement() {
  const { announceToScreenReader } = useAccessibility();

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  };

  const moveFocusTo = (element: HTMLElement, announceMessage?: string) => {
    element.focus();
    if (announceMessage) {
      announceToScreenReader(announceMessage);
    }
  };

  return { trapFocus, moveFocusTo };
}
