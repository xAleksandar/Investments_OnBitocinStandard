/**
 * Language Switcher Component
 * Manages language selection and switching across the application
 * Extracted from monolithic BitcoinGame class as part of Task 6.2
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';

export class LanguageSwitcher {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Language switcher state
        this.currentLanguage = 'en';
        this.isDropdownOpen = false;

        // Supported languages (limited to available translations)
        this.supportedLanguages = [
            {
                code: 'en',
                name: 'English',
                nativeName: 'English',
                flag: '🇺🇸',
                rtl: false
            },
            {
                code: 'bg',
                name: 'Bulgarian',
                nativeName: 'Български',
                flag: '🇧🇬',
                rtl: false
            }
        ];
    }

    /**
     * Initialize the language switcher component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('LanguageSwitcher already initialized');
            return;
        }

        try {
            // Ensure translation service is available (fallback to global)
            if (!this.services.translationService && window.translationService) {
                this.services.translationService = window.translationService;
            }
            if (!this.services.translationService) {
                console.error('LanguageSwitcher requires translationService');
                return;
            }

            // Load current language from service or storage
            this.loadCurrentLanguage();

            // Set up event listeners
            this.setupEventListeners();

            // Update initial UI state
            this.updateLanguageSwitcherUI();

            // Update mobile language switcher
            this.updateMobileLanguageSwitcher();

            this.isInitialized = true;
            console.log('LanguageSwitcher initialized successfully');

        } catch (error) {
            console.error('Failed to initialize language switcher:', error);
        }
    }

    /**
     * Load current language from service or localStorage
     */
    loadCurrentLanguage() {
        // Try to get from translation service first
        if (this.services.translationService?.getCurrentLanguage) {
            this.currentLanguage = this.services.translationService.getCurrentLanguage();
        } else {
            // Fallback to localStorage
            this.currentLanguage = localStorage.getItem('language') || 'en';
        }
    }

    /**
     * Set up language switcher event listeners
     */
    setupEventListeners() {
        // Desktop language switcher
        this.setupDesktopLanguageSwitcher();

        // Mobile language switcher
        this.setupMobileLanguageSwitcher();

        // Close dropdown when clicking outside
        const outsideClickHandler = (e) => {
            const langSwitcher = getElementById('languageSwitcher');
            const mobileLangSwitcher = getElementById('mobileLanguageSwitcher');

            if (this.isDropdownOpen &&
                !langSwitcher?.contains(e.target) &&
                !mobileLangSwitcher?.contains(e.target)) {
                this.closeDropdown();
            }
        };

        const cleanup = addEventListener(document, 'click', outsideClickHandler);
        this.eventListeners.push(cleanup);

        // Close dropdown on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isDropdownOpen) {
                this.closeDropdown();
            }
        };

        const escapeCleanup = addEventListener(document, 'keydown', escapeHandler);
        this.eventListeners.push(escapeCleanup);
    }

    /**
     * Set up desktop language switcher
     */
    setupDesktopLanguageSwitcher() {
        // Language switcher trigger
        const langSwitcher = getElementById('languageSwitcher');
        if (langSwitcher) {
            const cleanup = addEventListener(langSwitcher, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleDropdown();
            });
            this.eventListeners.push(cleanup);
        }

        // Language options in dropdown
        const langOptions = document.querySelectorAll('.language-option');
        langOptions.forEach(option => {
            const cleanup = addEventListener(option, 'click', (e) => {
                e.preventDefault();
                const langCode = option.dataset.language;
                if (langCode) {
                    this.switchLanguage(langCode);
                }
            });
            this.eventListeners.push(cleanup);
        });
    }

    /**
     * Set up mobile language switcher
     */
    setupMobileLanguageSwitcher() {
        // Mobile language switcher trigger
        const mobileLangSwitcher = getElementById('mobileLanguageSwitcher');
        if (mobileLangSwitcher) {
            const cleanup = addEventListener(mobileLangSwitcher, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMobileDropdown();
            });
            this.eventListeners.push(cleanup);
        }

        // Mobile language options
        const mobileLangOptions = document.querySelectorAll('.mobile-language-option');
        mobileLangOptions.forEach(option => {
            const cleanup = addEventListener(option, 'click', (e) => {
                e.preventDefault();
                const langCode = option.dataset.language;
                if (langCode) {
                    this.switchLanguage(langCode);
                }
            });
            this.eventListeners.push(cleanup);
        });
    }

    /**
     * Switch to a new language
     * @param {string} languageCode - Language code to switch to
     */
    async switchLanguage(languageCode) {
        if (!languageCode || languageCode === this.currentLanguage) {
            this.closeDropdown();
            return;
        }

        const language = this.supportedLanguages.find(lang => lang.code === languageCode);
        if (!language) {
            console.error('Unsupported language:', languageCode);
            return;
        }

        try {
            // Close dropdown first
            this.closeDropdown();

            // Show loading state
            this.showLoadingState();

            // Switch language in translation service
            if (this.services.translationService?.switchLanguage) {
                await this.services.translationService.switchLanguage(languageCode);
            } else if (this.services.translationService?.setLanguage) {
                await this.services.translationService.setLanguage(languageCode);
            }

            // Update current language
            this.currentLanguage = languageCode;

            // Store in localStorage
            localStorage.setItem('language', languageCode);

            // Update UI
            this.updateLanguageSwitcherUI();
            this.updateMobileLanguageSwitcher();

            // Update document language attribute
            document.documentElement.lang = languageCode;

            // Update text direction for RTL languages
            if (language.rtl) {
                document.documentElement.dir = 'rtl';
                document.body.classList.add('rtl');
            } else {
                document.documentElement.dir = 'ltr';
                document.body.classList.remove('rtl');
            }

            // Emit language change event
            this.emitLanguageChangeEvent(languageCode, language);

            // Hide loading state
            this.hideLoadingState();

        } catch (error) {
            console.error('Failed to switch language:', error);
            this.services.notificationService?.showError('Failed to change language');
            this.hideLoadingState();
        }
    }

    /**
     * Toggle dropdown menu
     */
    toggleDropdown() {
        if (this.isDropdownOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    /**
     * Open dropdown menu
     */
    openDropdown() {
        const dropdown = getElementById('languageDropdown');
        if (dropdown) {
            this.isDropdownOpen = true;
            dropdown.classList.add('open', 'show');
            dropdown.style.display = 'block';

            // Update dropdown content
            this.updateDropdownContent();

            // Emit event
            this.emitEvent('languageDropdownOpen');
        }
    }

    /**
     * Close dropdown menu
     */
    closeDropdown() {
        const dropdown = getElementById('languageDropdown');
        const mobileDropdown = getElementById('mobileLanguageDropdown');

        if (dropdown) {
            this.isDropdownOpen = false;
            dropdown.classList.remove('open', 'show');
            dropdown.style.display = 'none';
        }

        if (mobileDropdown) {
            mobileDropdown.classList.remove('open', 'show');
            mobileDropdown.style.display = 'none';
        }

        // Emit event
        this.emitEvent('languageDropdownClose');
    }

    /**
     * Toggle mobile dropdown menu
     */
    toggleMobileDropdown() {
        const mobileDropdown = getElementById('mobileLanguageDropdown');
        if (mobileDropdown) {
            const isOpen = mobileDropdown.classList.contains('open');
            if (isOpen) {
                this.closeDropdown();
            } else {
                this.openMobileDropdown();
            }
        }
    }

    /**
     * Open mobile dropdown menu
     */
    openMobileDropdown() {
        const mobileDropdown = getElementById('mobileLanguageDropdown');
        if (mobileDropdown) {
            this.isDropdownOpen = true;
            mobileDropdown.classList.add('open', 'show');
            mobileDropdown.style.display = 'block';

            // Update dropdown content
            this.updateMobileDropdownContent();

            // Emit event
            this.emitEvent('mobileLanguageDropdownOpen');
        }
    }

    /**
     * Update language switcher UI
     */
    updateLanguageSwitcherUI() {
        const currentLang = this.getCurrentLanguageInfo();
        if (!currentLang) {
return;
}

        // Update desktop language switcher
        // Support both legacy and current IDs in DOM
        const langFlag = getElementById('currentLanguageFlag') || getElementById('currentFlag');
        const langName = getElementById('currentLanguageName');
        const langCode = getElementById('currentLanguageCode') || getElementById('currentLanguage');

        if (langFlag) {
            // Ensure we don't keep any sprite/background classes like flag-en/bg
            try { langFlag.className = 'language-flag'; } catch {}
            langFlag.textContent = currentLang.flag;
        }

        if (langName) {
            langName.textContent = currentLang.name;
        }

        if (langCode) {
            // If this is a code element, show code; if text element, show code
            langCode.textContent = (currentLang.code || 'en').toUpperCase();
        }

        // Update language switcher trigger
        const langSwitcher = getElementById('languageSwitcher');
        if (langSwitcher) {
            langSwitcher.title = `Current language: ${currentLang.name}`;
        }
    }

    /**
     * Update mobile language switcher UI
     */
    updateMobileLanguageSwitcher() {
        const currentLang = this.getCurrentLanguageInfo();
        if (!currentLang) {
return;
}

        // Update mobile language switcher
        const mobileLangFlag = getElementById('mobileCurrentLanguageFlag');
        const mobileLangName = getElementById('mobileCurrentLanguageName');

        if (mobileLangFlag) {
            mobileLangFlag.textContent = currentLang.flag;
        }

        if (mobileLangName) {
            mobileLangName.textContent = currentLang.name;
        }
    }

    /**
     * Update dropdown content with available languages
     */
    updateDropdownContent() {
        const dropdown = getElementById('languageDropdown');
        if (!dropdown) {
return;
}

        let content = '';
        this.supportedLanguages.forEach(lang => {
            const isActive = lang.code === this.currentLanguage;
            const activeClass = isActive ? 'active' : '';

            content += `
                <div class="language-option ${activeClass}" data-language="${lang.code}">
                    <span class="language-flag">${lang.flag}</span>
                    <span class="language-name">${lang.name}</span>
                    <span class="language-native">${lang.nativeName}</span>
                    ${isActive ? '<span class="language-check">✓</span>' : ''}
                </div>
            `;
        });

        dropdown.innerHTML = content;

        // Re-attach event listeners for new options
        const options = dropdown.querySelectorAll('.language-option');
        options.forEach(option => {
            const cleanup = addEventListener(option, 'click', (e) => {
                e.preventDefault();
                const langCode = option.dataset.language;
                if (langCode) {
                    this.switchLanguage(langCode);
                }
            });
            this.eventListeners.push(cleanup);
        });
    }

    /**
     * Update mobile dropdown content
     */
    updateMobileDropdownContent() {
        const mobileDropdown = getElementById('mobileLanguageDropdown');
        if (!mobileDropdown) {
return;
}

        let content = '';
        this.supportedLanguages.forEach(lang => {
            const isActive = lang.code === this.currentLanguage;
            const activeClass = isActive ? 'active' : '';

            content += `
                <div class="mobile-language-option ${activeClass}" data-language="${lang.code}">
                    <span class="language-flag">${lang.flag}</span>
                    <span class="language-name">${lang.name}</span>
                    ${isActive ? '<span class="language-check">✓</span>' : ''}
                </div>
            `;
        });

        mobileDropdown.innerHTML = content;

        // Re-attach event listeners for new options
        const options = mobileDropdown.querySelectorAll('.mobile-language-option');
        options.forEach(option => {
            const cleanup = addEventListener(option, 'click', (e) => {
                e.preventDefault();
                const langCode = option.dataset.language;
                if (langCode) {
                    this.switchLanguage(langCode);
                }
            });
            this.eventListeners.push(cleanup);
        });
    }

    /**
     * Get current language information
     * @returns {Object|null} Current language info object
     */
    getCurrentLanguageInfo() {
        return this.supportedLanguages.find(lang => lang.code === this.currentLanguage);
    }

    /**
     * Show loading state during language switch
     */
    showLoadingState() {
        const langSwitcher = getElementById('languageSwitcher');
        const mobileLangSwitcher = getElementById('mobileLanguageSwitcher');

        if (langSwitcher) {
            langSwitcher.classList.add('loading');
            langSwitcher.style.pointerEvents = 'none';
        }

        if (mobileLangSwitcher) {
            mobileLangSwitcher.classList.add('loading');
            mobileLangSwitcher.style.pointerEvents = 'none';
        }
    }

    /**
     * Hide loading state after language switch
     */
    hideLoadingState() {
        const langSwitcher = getElementById('languageSwitcher');
        const mobileLangSwitcher = getElementById('mobileLanguageSwitcher');

        if (langSwitcher) {
            langSwitcher.classList.remove('loading');
            langSwitcher.style.pointerEvents = 'auto';
        }

        if (mobileLangSwitcher) {
            mobileLangSwitcher.classList.remove('loading');
            mobileLangSwitcher.style.pointerEvents = 'auto';
        }
    }

    /**
     * Get supported languages list
     * @returns {Array} Array of supported language objects
     */
    getSupportedLanguages() {
        return [...this.supportedLanguages];
    }

    /**
     * Add a new supported language
     * @param {Object} language - Language configuration object
     */
    addSupportedLanguage(language) {
        if (!language.code || !language.name) {
            console.error('Invalid language configuration');
            return;
        }

        const exists = this.supportedLanguages.find(lang => lang.code === language.code);
        if (exists) {
            console.warn('Language already exists:', language.code);
            return;
        }

        this.supportedLanguages.push({
            rtl: false,
            flag: '🌐',
            nativeName: language.name,
            ...language
        });

        // Update UI if initialized
        if (this.isInitialized) {
            this.updateDropdownContent();
            this.updateMobileDropdownContent();
        }
    }

    /**
     * Get current language code
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Check if dropdown is open
     * @returns {boolean} True if dropdown is open
     */
    isDropdownMenuOpen() {
        return this.isDropdownOpen;
    }

    /**
     * Force close dropdown (for external control)
     */
    forceCloseDropdown() {
        if (this.isDropdownOpen) {
            this.closeDropdown();
        }
    }

    /**
     * Refresh language switcher state
     */
    refresh() {
        this.loadCurrentLanguage();
        this.updateLanguageSwitcherUI();
        this.updateMobileLanguageSwitcher();
        if (this.isDropdownOpen) {
            this.updateDropdownContent();
            this.updateMobileDropdownContent();
        }
    }

    /**
     * Emit language change event
     * @param {string} languageCode - New language code
     * @param {Object} languageInfo - Language information object
     */
    emitLanguageChangeEvent(languageCode, languageInfo) {
        const event = new CustomEvent('languageChange', {
            detail: {
                language: languageCode,
                languageInfo,
                previousLanguage: this.currentLanguage,
                component: 'LanguageSwitcher'
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    emitEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...detail, component: 'LanguageSwitcher', currentLanguage: this.currentLanguage }
        });
        document.dispatchEvent(event);
    }

    /**
     * Destroy the language switcher component
     */
    destroy() {
        console.log('Destroying language switcher');

        // Close dropdown if open
        if (this.isDropdownOpen) {
            this.closeDropdown();
        }

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up language switcher event listener:', error);
            }
        });
        this.eventListeners = [];

        // Reset state
        this.currentLanguage = 'en';
        this.isDropdownOpen = false;
        this.isInitialized = false;

        console.log('Language switcher destroyed');
    }
}

// Export singleton instance factory
export function createLanguageSwitcher(services) {
    return new LanguageSwitcher(services);
}

export default LanguageSwitcher;
