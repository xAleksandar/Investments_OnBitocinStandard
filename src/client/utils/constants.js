/**
 * Frontend-specific constants
 * UI-related constants that complement shared constants
 */

// ===== UI TIMING CONSTANTS =====
export const TIMING = {
    NOTIFICATION_AUTO_HIDE: 5000, // 5 seconds
    PRICE_REFRESH_INTERVAL: 30000, // 30 seconds
    DEBOUNCE_DELAY: 300, // milliseconds
    THROTTLE_LIMIT: 100, // milliseconds
    LOADING_MIN_DURATION: 500, // minimum loading time for UX
    ANIMATION_DURATION: 300, // CSS transition duration
    TOOLTIP_DELAY: 700, // tooltip show delay
};

// ===== CSS CLASS CONSTANTS =====
export const CSS_CLASSES = {
    // Visibility
    HIDDEN: 'hidden',
    VISIBLE: 'block',

    // Button states
    BUTTON_LOADING: 'loading',
    BUTTON_DISABLED: 'disabled',

    // Form validation states
    FIELD_VALID: 'border-green-300 focus:border-green-500',
    FIELD_INVALID: 'border-red-300 focus:border-red-500',
    FIELD_WARNING: 'border-yellow-300 focus:border-yellow-500',

    // Text colors for validation
    TEXT_SUCCESS: 'text-green-600',
    TEXT_ERROR: 'text-red-600',
    TEXT_WARNING: 'text-yellow-600',
    TEXT_INFO: 'text-blue-600',
    TEXT_GRAY: 'text-gray-500',

    // Background colors
    BG_SUCCESS: 'bg-green-50',
    BG_ERROR: 'bg-red-50',
    BG_WARNING: 'bg-yellow-50',
    BG_INFO: 'bg-blue-50',
    BG_GRAY: 'bg-gray-50',

    // Performance indicators
    PERFORMANCE_POSITIVE: 'text-green-600',
    PERFORMANCE_NEGATIVE: 'text-red-600',
    PERFORMANCE_NEUTRAL: 'text-gray-600',

    // Lock status styling
    LOCK_LOCKED: 'bg-red-50 border-red-200',
    LOCK_PARTIAL: 'bg-yellow-50 border-yellow-200',
    LOCK_UNLOCKED: 'bg-green-50 border-green-200',

    // Navigation states
    NAV_ACTIVE: 'bg-blue-100 text-blue-700',
    NAV_INACTIVE: 'text-gray-600 hover:text-gray-900',

    // Modal and overlay
    MODAL_OVERLAY: 'fixed inset-0 bg-black bg-opacity-50 z-50',
    MODAL_CONTAINER: 'fixed inset-0 flex items-center justify-center z-50',

    // Dropdown states
    DROPDOWN_OPTION: 'custom-select-option',
    DROPDOWN_SELECTED: 'selected',
    DROPDOWN_OPEN: 'open',

    // Notification types
    NOTIFICATION_SUCCESS: 'bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 max-w-sm',
    NOTIFICATION_ERROR: 'bg-white border-l-4 border-red-500 rounded-lg shadow-lg p-4 max-w-sm',
    NOTIFICATION_WARNING: 'bg-white border-l-4 border-yellow-500 rounded-lg shadow-lg p-4 max-w-sm',
    NOTIFICATION_INFO: 'bg-white border-l-4 border-blue-500 rounded-lg shadow-lg p-4 max-w-sm',
};

// ===== UI ELEMENT IDs =====
export const ELEMENT_IDS = {
    // Authentication
    AUTH_MESSAGE: 'authMessage',
    EMAIL_INPUT: 'email',
    USERNAME_INPUT: 'username',
    USERNAME_FIELD: 'usernameField',

    // Navigation
    NAV_LOGIN_BTN: 'navLoginBtn',
    NAV_USER_INFO: 'navUserInfo',
    NAV_LOGOUT_BTN: 'navLogoutBtn',
    MOBILE_MENU_BTN: 'mobileMenuBtn',

    // Portfolio
    HOLDINGS: 'holdings',
    TOTAL_VALUE: 'totalValue',
    PERFORMANCE: 'performance',
    TRADE_HISTORY: 'tradeHistory',

    // Trading
    FROM_ASSET_SELECT: 'fromAsset',
    TO_ASSET_SELECT: 'toAsset',
    TRADE_AMOUNT: 'tradeAmount',
    TRADE_HELPER: 'tradeHelper',

    // Notifications
    NOTIFICATION: 'notification',
    NOTIFICATION_MESSAGE: 'notificationMessage',
    NOTIFICATION_ICON: 'notificationIcon',

    // Language switching
    LANGUAGE_SWITCHER: 'languageSwitcher',
    LANGUAGE_TRIGGER: 'languageTrigger',
    LANGUAGE_DROPDOWN: 'languageDropdown',
    CURRENT_FLAG: 'currentFlag',
    CURRENT_LANGUAGE: 'currentLanguage',

    // Suggestions
    SUGGESTIONS_FAB: 'suggestionsFab',
    SUGGESTIONS_MODAL: 'suggestionsModal',
    CLOSE_SUGGESTIONS_MODAL: 'closeSuggestionsModal',

    // Modals
    DELETE_CONFIRM_MODAL: 'deleteConfirmModal',
    DELETE_CONFIRM_MESSAGE: 'deleteConfirmMessage',
};

// ===== TRADE CONSTANTS =====
export const TRADE = {
    MIN_BTC_TRADE_SATS: 100000, // 100k sats minimum for BTC trades
    MIN_BTC_TRADE_DISPLAY: '100 kSats',
    SATOSHIS_PER_BTC: 100000000,
    DECIMAL_PRECISION: 8,
    DISPLAY_PRECISION_HIGH: 8,
    DISPLAY_PRECISION_LOW: 4,
    DISPLAY_THRESHOLD: 0.001, // Below this, use high precision
};

// ===== PORTFOLIO CONSTANTS =====
export const PORTFOLIO = {
    BASELINE_SATS: 100000000, // 1 BTC baseline
    BASELINE_DISPLAY: '1 BTC',
    LOCK_DURATION_HOURS: 24, // 24 hour lock period
    REFRESH_INTERVAL: 30000, // 30 seconds
};

// ===== NOTIFICATION CONSTANTS =====
export const NOTIFICATIONS = {
    TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },

    ICONS: {
        SUCCESS: '✓',
        ERROR: '✕',
        WARNING: '⚠',
        INFO: 'ℹ'
    },

    AUTO_HIDE_DELAYS: {
        SUCCESS: 5000,
        ERROR: 8000,
        WARNING: 6000,
        INFO: 5000,
        TRADE_SUCCESS: 7000,
        TRADE_ERROR: 8000
    }
};

// ===== FORM VALIDATION CONSTANTS =====
export const VALIDATION = {
    DEBOUNCE_DELAY: 300,
    EMAIL_MAX_LENGTH: 255,
    USERNAME_MIN_LENGTH: 2,
    USERNAME_MAX_LENGTH: 50,
    SUGGESTION_TITLE_MIN: 5,
    SUGGESTION_TITLE_MAX: 100,
    SUGGESTION_DESC_MIN: 10,
    SUGGESTION_DESC_MAX: 1000,

    PATTERNS: {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        USERNAME: /^[a-zA-Z0-9_-]+$/,
        NUMBER_ONLY: /^[0-9.]+$/,
        AMOUNT_INPUT: /[^0-9.-]/g
    }
};

// ===== RESPONSIVE BREAKPOINTS =====
export const BREAKPOINTS = {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1280,
    LARGE: 1536
};

// ===== ANIMATION CONSTANTS =====
export const ANIMATIONS = {
    EASE_IN_OUT: 'ease-in-out',
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    LINEAR: 'linear',

    DURATIONS: {
        FAST: 150,
        NORMAL: 300,
        SLOW: 500,
        VERY_SLOW: 1000
    }
};

// ===== LOCALSTORAGE KEYS =====
export const STORAGE_KEYS = {
    TOKEN: 'token',
    USER: 'user',
    LANGUAGE: 'language',
    THEME: 'theme',
    PREFERENCES: 'userPreferences'
};

// ===== API RELATED CONSTANTS =====
export const API = {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second

    ENDPOINTS: {
        ASSETS: '/api/assets',
        PRICES: '/api/assets/prices',
        PORTFOLIO: '/api/portfolio',
        TRADES: '/api/trades',
        AUTH: '/api/auth',
        SUGGESTIONS: '/api/suggestions'
    }
};

// ===== UI STATE CONSTANTS =====
export const UI_STATES = {
    LOADING: 'loading',
    LOADED: 'loaded',
    ERROR: 'error',
    EMPTY: 'empty',
    REFRESHING: 'refreshing'
};

// ===== CHART AND VISUALIZATION =====
export const CHARTS = {
    DEFAULT_HEIGHT: 400,
    MOBILE_HEIGHT: 300,
    PERFORMANCE_PERIODS: ['1d', '1w', '1m', '3m', '1y', '5y'],
    COLORS: {
        POSITIVE: '#10B981', // green-500
        NEGATIVE: '#EF4444', // red-500
        NEUTRAL: '#6B7280',  // gray-500
        PRIMARY: '#3B82F6',  // blue-500
        SECONDARY: '#8B5CF6' // purple-500
    }
};

// ===== ASSET DISPLAY CONSTANTS =====
export const ASSETS = {
    DISPLAY_FORMATS: {
        DROPDOWN: (asset) => `${asset.name} (${asset.symbol})`,
        LIST: (asset) => asset.name,
        SYMBOL_ONLY: (asset) => asset.symbol
    },

    SORT_ORDERS: {
        ALPHABETICAL: 'alphabetical',
        VALUE: 'value',
        PERFORMANCE: 'performance',
        SYMBOL: 'symbol'
    }
};

// ===== FEATURE FLAGS =====
export const FEATURES = {
    PRICE_AUTO_REFRESH: true,
    SUGGESTIONS_SYSTEM: true,
    ADMIN_PANEL: true,
    MOBILE_OPTIMIZATIONS: true,
    PERFORMANCE_CHARTS: true,
    REAL_TIME_UPDATES: true
};

// ===== ERROR MESSAGES =====
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    AUTHENTICATION_REQUIRED: 'Please log in to continue.',
    INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction.',
    INVALID_AMOUNT: 'Please enter a valid amount.',
    TRADE_FAILED: 'Trade execution failed. Please try again.',
    PRICE_UNAVAILABLE: 'Asset prices are currently unavailable.',
    GENERIC_ERROR: 'An unexpected error occurred. Please try again.'
};

// ===== SUCCESS MESSAGES =====
export const SUCCESS_MESSAGES = {
    TRADE_EXECUTED: 'Trade executed successfully!',
    LOGIN_SUCCESS: 'Welcome back!',
    LOGOUT_SUCCESS: 'You have been logged out.',
    SETTINGS_SAVED: 'Settings saved successfully.',
    SUGGESTION_SUBMITTED: 'Thank you for your feedback!'
};