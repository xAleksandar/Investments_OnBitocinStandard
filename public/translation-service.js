class TranslationService {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = {};
        this.isReady = false;
        this.readyPromise = null;
        this.loadTranslations();
    }

    async loadTranslations() {
        // Create or update the ready promise
        this.readyPromise = this._doLoadTranslations();
        await this.readyPromise;
    }

    async _doLoadTranslations() {
        try {
            this.isReady = false;
            // Dynamically import the appropriate translation file
            const translationModule = await import(`./translations/${this.currentLanguage}.js`);
            this.translations = translationModule.default || translationModule.translations;
            this.isReady = true;

            // Auto-update page translations when ready (if DOM is loaded)
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.updatePageTranslations();
                    this.notifyLanguageReady();
                });
            } else {
                // DOM is already loaded, update immediately
                this.updatePageTranslations();
                this.notifyLanguageReady();
            }
        } catch (error) {
            console.warn(`Failed to load translations for ${this.currentLanguage}, falling back to English`);
            if (this.currentLanguage !== 'en') {
                this.currentLanguage = 'en';
                const englishModule = await import('./translations/en.js');
                this.translations = englishModule.default || englishModule.translations;
            }
            this.isReady = true;

            // Auto-update page translations when ready (if DOM is loaded)
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.updatePageTranslations();
                    this.notifyLanguageReady();
                });
            } else {
                // DOM is already loaded, update immediately
                this.updatePageTranslations();
                this.notifyLanguageReady();
            }
        }
    }

    // Promise that resolves when translations are ready
    async whenReady() {
        if (this.isReady) {
            return Promise.resolve();
        }
        return this.readyPromise || Promise.resolve();
    }

    async setLanguage(language) {
        if (language === this.currentLanguage) return;

        this.currentLanguage = language;
        localStorage.setItem('language', language);
        await this.loadTranslations();
        await this.updatePageTranslations();

        // Trigger a custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('languageChange', {
            detail: { language: this.currentLanguage }
        }));
    }

    translate(key, fallback = null) {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return fallback || key;
            }
        }

        return value || fallback || key;
    }

    // Short alias for translate
    t(key, fallback = null) {
        return this.translate(key, fallback);
    }

    async updatePageTranslations() {
        // Wait for translations to be ready
        await this.whenReady();

        // Update all elements with data-translate attribute
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translated = this.translate(key);

            // Debug: log translation failures
            if (translated === key) {
                console.warn(`Translation not found for key: ${key}`);
            }

            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translated;
            } else if (element.tagName === 'OPTGROUP') {
                // For optgroups, preserve any existing emoji/symbols and append translated text
                const currentLabel = element.label;
                const emojiMatch = currentLabel.match(/^([^\w\s]+)\s*/);
                const emoji = emojiMatch ? emojiMatch[1] + ' ' : '';
                element.label = emoji + translated;
            } else if (element.tagName === 'OPTION' && translated !== key) {
                // For options with successful translations, update text content
                element.textContent = translated;
            } else if (translated !== key) {
                // Only update if translation was successful
                element.textContent = translated;
            }
        });

        // Update all elements with data-translate-html attribute (for HTML content)
        document.querySelectorAll('[data-translate-html]').forEach(element => {
            const key = element.getAttribute('data-translate-html');
            const translated = this.translate(key);
            if (translated !== key) {
                element.innerHTML = translated;
            }
        });

        // Update page title
        const titleKey = document.querySelector('meta[name="title-key"]');
        if (titleKey) {
            const translated = this.translate(titleKey.getAttribute('content'));
            if (translated !== titleKey.getAttribute('content')) {
                document.title = translated;
            }
        }
    }

    formatNumber(number, options = {}) {
        const locale = this.currentLanguage === 'bg' ? 'bg-BG' : 'en-US';
        return new Intl.NumberFormat(locale, options).format(number);
    }

    formatDate(date, options = {}) {
        const locale = this.currentLanguage === 'bg' ? 'bg-BG' : 'en-US';
        return new Intl.DateTimeFormat(locale, options).format(date);
    }

    formatCurrency(amount, currency = 'USD') {
        const locale = this.currentLanguage === 'bg' ? 'bg-BG' : 'en-US';
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    formatSatoshis(sats) {
        if (sats >= 100000000) {
            return this.formatNumber(sats / 100000000, { maximumFractionDigits: 8 }) + ' BTC';
        } else if (sats >= 1000) {
            return this.formatNumber(sats, { maximumFractionDigits: 0 }) + ' ' + this.translate('common.sats');
        } else {
            return this.formatNumber(sats, { maximumFractionDigits: 0 }) + ' ' + this.translate('common.sats');
        }
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getSupportedLanguages() {
        return [
            { code: 'en', name: 'English', nativeName: 'English' },
            { code: 'bg', name: 'Bulgarian', nativeName: 'Български' }
        ];
    }

    /**
     * Notify components that translation service is ready with current language
     */
    notifyLanguageReady() {
        window.dispatchEvent(new CustomEvent('languageServiceReady', {
            detail: { language: this.currentLanguage }
        }));
    }
}

// Create global translation service instance
window.translationService = new TranslationService();