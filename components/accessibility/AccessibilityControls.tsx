'use client';

import React, { useState } from 'react';
import { useAccessibility } from './AccessibilityProvider';
import { Settings, Eye, Type, Contrast, Volume2, Keyboard, RotateCcw } from 'lucide-react';

export function AccessibilityControls() {
  const { settings, updateSetting, resetSettings, announceToScreenReader } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    announceToScreenReader(
      isOpen ? 'Accessibility controls closed' : 'Accessibility controls opened'
    );
  };

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    updateSetting(key, value);
    announceToScreenReader(`${key} ${value ? 'enabled' : 'disabled'}`);
  };

  const handleReset = () => {
    resetSettings();
    announceToScreenReader('Accessibility settings reset to defaults');
  };

  return (
    <div className="accessibility-controls">
      {/* Accessibility Controls Toggle Button */}
      <button
        className="accessibility-toggle"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls="accessibility-panel"
        aria-label="Open accessibility controls"
        title="Accessibility Controls"
      >
        <Settings size={20} />
        <span className="sr-only">Accessibility Controls</span>
      </button>

      {/* Skip Links */}
      <div className="skip-links">
        <a 
          href="#main-content" 
          className="skip-link"
          data-skip-link
          onFocus={() => announceToScreenReader('Skip to main content link focused')}
        >
          Skip to main content
        </a>
        <a 
          href="#navigation" 
          className="skip-link"
          onFocus={() => announceToScreenReader('Skip to navigation link focused')}
        >
          Skip to navigation
        </a>
        <a 
          href="#footer" 
          className="skip-link"
          onFocus={() => announceToScreenReader('Skip to footer link focused')}
        >
          Skip to footer
        </a>
      </div>

      {/* Accessibility Controls Panel */}
      {isOpen && (
        <div
          id="accessibility-panel"
          className="accessibility-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accessibility-title"
          aria-hidden={!isOpen}
        >
          <div className="accessibility-panel-content">
            <div className="accessibility-panel-header">
              <h2 id="accessibility-title" className="accessibility-panel-title">
                <Settings size={20} />
                Accessibility Settings
              </h2>
              <button
                className="accessibility-panel-close"
                onClick={handleToggle}
                aria-label="Close accessibility controls"
                data-close
              >
                ×
              </button>
            </div>

            <div className="accessibility-panel-body">
              {/* Visual Settings */}
              <section className="accessibility-section">
                <h3 className="accessibility-section-title">
                  <Eye size={16} />
                  Visual Settings
                </h3>

                <div className="accessibility-control">
                  <label className="accessibility-label">
                    <input
                      type="checkbox"
                      checked={settings.highContrast}
                      onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                      aria-describedby="high-contrast-desc"
                    />
                    <span className="accessibility-label-text">
                      <Contrast size={16} />
                      High Contrast Mode
                    </span>
                  </label>
                  <p id="high-contrast-desc" className="accessibility-description">
                    Increases contrast between text and background for better visibility
                  </p>
                </div>

                <div className="accessibility-control">
                  <label className="accessibility-label">
                    <input
                      type="checkbox"
                      checked={settings.largeText}
                      onChange={(e) => handleSettingChange('largeText', e.target.checked)}
                      aria-describedby="large-text-desc"
                    />
                    <span className="accessibility-label-text">
                      <Type size={16} />
                      Large Text
                    </span>
                  </label>
                  <p id="large-text-desc" className="accessibility-description">
                    Increases text size throughout the application
                  </p>
                </div>

                <div className="accessibility-control">
                  <label htmlFor="font-size-select" className="accessibility-label-text">
                    Font Size
                  </label>
                  <select
                    id="font-size-select"
                    value={settings.fontSize}
                    onChange={(e) => handleSettingChange('fontSize', e.target.value)}
                    className="accessibility-select"
                    aria-describedby="font-size-desc"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="extra-large">Extra Large</option>
                  </select>
                  <p id="font-size-desc" className="accessibility-description">
                    Adjust the base font size for all text
                  </p>
                </div>

                <div className="accessibility-control">
                  <label htmlFor="theme-select" className="accessibility-label-text">
                    Theme
                  </label>
                  <select
                    id="theme-select"
                    value={settings.theme}
                    onChange={(e) => handleSettingChange('theme', e.target.value)}
                    className="accessibility-select"
                    aria-describedby="theme-desc"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="high-contrast">High Contrast</option>
                  </select>
                  <p id="theme-desc" className="accessibility-description">
                    Choose your preferred color theme
                  </p>
                </div>
              </section>

              {/* Motion Settings */}
              <section className="accessibility-section">
                <h3 className="accessibility-section-title">
                  Motion Settings
                </h3>

                <div className="accessibility-control">
                  <label className="accessibility-label">
                    <input
                      type="checkbox"
                      checked={settings.reducedMotion}
                      onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                      aria-describedby="reduced-motion-desc"
                    />
                    <span className="accessibility-label-text">
                      Reduce Motion
                    </span>
                  </label>
                  <p id="reduced-motion-desc" className="accessibility-description">
                    Minimizes animations and transitions that may cause discomfort
                  </p>
                </div>
              </section>

              {/* Navigation Settings */}
              <section className="accessibility-section">
                <h3 className="accessibility-section-title">
                  <Keyboard size={16} />
                  Navigation Settings
                </h3>

                <div className="accessibility-control">
                  <label className="accessibility-label">
                    <input
                      type="checkbox"
                      checked={settings.keyboardNavigation}
                      onChange={(e) => handleSettingChange('keyboardNavigation', e.target.checked)}
                      aria-describedby="keyboard-nav-desc"
                    />
                    <span className="accessibility-label-text">
                      Enhanced Keyboard Navigation
                    </span>
                  </label>
                  <p id="keyboard-nav-desc" className="accessibility-description">
                    Enables enhanced keyboard shortcuts and focus indicators
                  </p>
                </div>

                <div className="accessibility-control">
                  <label className="accessibility-label">
                    <input
                      type="checkbox"
                      checked={settings.screenReaderMode}
                      onChange={(e) => handleSettingChange('screenReaderMode', e.target.checked)}
                      aria-describedby="screen-reader-desc"
                    />
                    <span className="accessibility-label-text">
                      <Volume2 size={16} />
                      Screen Reader Mode
                    </span>
                  </label>
                  <p id="screen-reader-desc" className="accessibility-description">
                    Optimizes the interface for screen reader users
                  </p>
                </div>
              </section>

              {/* Keyboard Shortcuts Info */}
              <section className="accessibility-section">
                <h3 className="accessibility-section-title">
                  Keyboard Shortcuts
                </h3>
                <div className="keyboard-shortcuts">
                  <div className="shortcut-item">
                    <kbd>Tab</kbd> - Navigate forward through interactive elements
                  </div>
                  <div className="shortcut-item">
                    <kbd>Shift + Tab</kbd> - Navigate backward through interactive elements
                  </div>
                  <div className="shortcut-item">
                    <kbd>Enter</kbd> or <kbd>Space</kbd> - Activate buttons and links
                  </div>
                  <div className="shortcut-item">
                    <kbd>Escape</kbd> - Close modals and dropdowns
                  </div>
                  <div className="shortcut-item">
                    <kbd>Ctrl + Shift + Tab</kbd> - Focus skip links
                  </div>
                </div>
              </section>

              {/* Reset Button */}
              <div className="accessibility-panel-footer">
                <button
                  className="accessibility-reset-button"
                  onClick={handleReset}
                  aria-label="Reset all accessibility settings to defaults"
                >
                  <RotateCcw size={16} />
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Keyboard shortcut component for displaying shortcuts
export function KeyboardShortcut({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="keyboard-shortcut" role="group" aria-label={`Keyboard shortcut: ${description}`}>
      <div className="shortcut-keys">
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            <kbd className="shortcut-key">{key}</kbd>
            {index < keys.length - 1 && <span className="shortcut-separator">+</span>}
          </React.Fragment>
        ))}
      </div>
      <span className="shortcut-description">{description}</span>
    </div>
  );
}
