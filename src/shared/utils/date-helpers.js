// Shared date manipulation and formatting utilities
// Used by both client and server for consistent date handling

/**
 * Formats a date to a readable string
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format type ('short', 'medium', 'long', 'time', 'datetime')
 * @returns {string} Formatted date string
 */
function formatDate(date, format = 'medium') {
    if (!date) return '';

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const options = {
        short: {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        },
        medium: {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        },
        long: {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        },
        time: {
            hour: '2-digit',
            minute: '2-digit'
        },
        datetime: {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }
    };

    return dateObj.toLocaleDateString('en-US', options[format] || options.medium);
}

/**
 * Formats a date as relative time (e.g., "2 hours ago", "in 3 days")
 * @param {Date|string|number} date - Date to format
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
    if (!date) return '';

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (Math.abs(diffSeconds) < 60) {
        return 'just now';
    } else if (Math.abs(diffMinutes) < 60) {
        return diffMinutes > 0 ? `${diffMinutes} minutes ago` : `in ${Math.abs(diffMinutes)} minutes`;
    } else if (Math.abs(diffHours) < 24) {
        return diffHours > 0 ? `${diffHours} hours ago` : `in ${Math.abs(diffHours)} hours`;
    } else if (Math.abs(diffDays) < 7) {
        return diffDays > 0 ? `${diffDays} days ago` : `in ${Math.abs(diffDays)} days`;
    } else if (Math.abs(diffWeeks) < 4) {
        return diffWeeks > 0 ? `${diffWeeks} weeks ago` : `in ${Math.abs(diffWeeks)} weeks`;
    } else if (Math.abs(diffMonths) < 12) {
        return diffMonths > 0 ? `${diffMonths} months ago` : `in ${Math.abs(diffMonths)} months`;
    } else {
        return diffYears > 0 ? `${diffYears} years ago` : `in ${Math.abs(diffYears)} years`;
    }
}

/**
 * Checks if a date is within the last 24 hours
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if within last 24 hours
 */
function isWithin24Hours(date) {
    if (!date) return false;

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return false;

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours >= 0 && diffHours <= 24;
}

/**
 * Checks if a date is older than 24 hours (for trade reflection period)
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if older than 24 hours
 */
function isOlderThan24Hours(date) {
    if (!date) return true; // Treat missing dates as old

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return true;

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours > 24;
}

/**
 * Gets the start of day for a given date
 * @param {Date|string|number} date - Date to process
 * @returns {Date} Start of day
 */
function getStartOfDay(date = new Date()) {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    return dateObj;
}

/**
 * Gets the end of day for a given date
 * @param {Date|string|number} date - Date to process
 * @returns {Date} End of day
 */
function getEndOfDay(date = new Date()) {
    const dateObj = new Date(date);
    dateObj.setHours(23, 59, 59, 999);
    return dateObj;
}

/**
 * Adds days to a date
 * @param {Date|string|number} date - Base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} New date with days added
 */
function addDays(date, days) {
    const dateObj = new Date(date);
    dateObj.setDate(dateObj.getDate() + days);
    return dateObj;
}

/**
 * Adds hours to a date
 * @param {Date|string|number} date - Base date
 * @param {number} hours - Number of hours to add (can be negative)
 * @returns {Date} New date with hours added
 */
function addHours(date, hours) {
    const dateObj = new Date(date);
    dateObj.setTime(dateObj.getTime() + (hours * 60 * 60 * 1000));
    return dateObj;
}

/**
 * Checks if two dates are on the same day
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {boolean} True if same day
 */
function isSameDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

/**
 * Gets a date range for a given period
 * @param {string} period - Period type ('today', 'week', 'month', 'year')
 * @returns {Object} Object with start and end dates
 */
function getDateRange(period) {
    const now = new Date();
    let start, end;

    switch (period) {
        case 'today':
            start = getStartOfDay(now);
            end = getEndOfDay(now);
            break;
        case 'week':
            start = getStartOfDay(addDays(now, -7));
            end = getEndOfDay(now);
            break;
        case 'month':
            start = getStartOfDay(addDays(now, -30));
            end = getEndOfDay(now);
            break;
        case 'year':
            start = getStartOfDay(addDays(now, -365));
            end = getEndOfDay(now);
            break;
        default:
            start = getStartOfDay(now);
            end = getEndOfDay(now);
    }

    return { start, end };
}

/**
 * Formats a date for API transmission (ISO string)
 * @param {Date|string|number} date - Date to format
 * @returns {string} ISO date string
 */
function toApiDate(date) {
    if (!date) return null;

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;

    return dateObj.toISOString();
}

/**
 * Parses an API date string to Date object
 * @param {string} dateString - ISO date string from API
 * @returns {Date|null} Parsed date or null if invalid
 */
function fromApiDate(dateString) {
    if (!dateString) return null;

    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Calculates the time remaining until 24 hours have passed
 * @param {Date|string|number} startDate - Start date
 * @returns {Object} Object with hours, minutes, and formatted string
 */
function getTimeUntil24Hours(startDate) {
    if (!startDate) return { hours: 0, minutes: 0, formatted: '0 hours' };

    const start = new Date(startDate);
    if (isNaN(start.getTime())) return { hours: 0, minutes: 0, formatted: '0 hours' };

    const target = addHours(start, 24);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();

    if (diffMs <= 0) {
        return { hours: 0, minutes: 0, formatted: '0 hours' };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let formatted = '';
    if (hours > 0) {
        formatted += `${hours} hour${hours !== 1 ? 's' : ''}`;
        if (minutes > 0) {
            formatted += ` ${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
    } else {
        formatted = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    return { hours, minutes, formatted };
}

module.exports = {
    formatDate,
    formatRelativeTime,
    isWithin24Hours,
    isOlderThan24Hours,
    getStartOfDay,
    getEndOfDay,
    addDays,
    addHours,
    isSameDay,
    getDateRange,
    toApiDate,
    fromApiDate,
    getTimeUntil24Hours
};