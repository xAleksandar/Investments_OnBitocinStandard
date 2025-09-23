/**
 * DOM manipulation utilities for consistent and safe DOM operations
 * Provides helper functions for common DOM tasks used throughout the frontend
 */

/**
 * Safely get element by ID with optional error handling
 * @param {string} id - Element ID
 * @param {boolean} required - Whether element is required (throws if not found)
 * @returns {HTMLElement|null} Element or null if not found
 */
export function getElementById(id, required = false) {
    const element = document.getElementById(id);

    if (required && !element) {
        throw new Error(`Required element with ID '${id}' not found`);
    }

    return element;
}

/**
 * Safely query selector with optional error handling
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (optional)
 * @param {boolean} required - Whether element is required
 * @returns {HTMLElement|null} Element or null if not found
 */
export function querySelector(selector, parent = document, required = false) {
    const element = parent.querySelector(selector);

    if (required && !element) {
        throw new Error(`Required element with selector '${selector}' not found`);
    }

    return element;
}

/**
 * Safely query all elements with selector
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (optional)
 * @returns {NodeList} List of elements
 */
export function querySelectorAll(selector, parent = document) {
    return parent.querySelectorAll(selector);
}

/**
 * Create element with attributes and content
 * @param {string} tagName - HTML tag name
 * @param {Object} attributes - Attributes to set
 * @param {string|HTMLElement} content - Text content or child elements
 * @returns {HTMLElement} Created element
 */
export function createElement(tagName, attributes = {}, content = null) {
    const element = document.createElement(tagName);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className' || key === 'class') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else {
            element.setAttribute(key, value);
        }
    });

    // Set content
    if (content !== null) {
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (content instanceof HTMLElement) {
            element.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(child => {
                if (child instanceof HTMLElement) {
                    element.appendChild(child);
                }
            });
        }
    }

    return element;
}

/**
 * Create option element for select dropdowns
 * @param {string} text - Option text
 * @param {string} value - Option value
 * @param {boolean} selected - Whether option is selected
 * @returns {HTMLOptionElement} Created option element
 */
export function createOption(text, value, selected = false) {
    const option = new Option(text, value);
    option.selected = selected;
    return option;
}

/**
 * Create custom dropdown option div
 * @param {string} text - Option text
 * @param {string} value - Option value
 * @param {boolean} selected - Whether option is selected
 * @returns {HTMLDivElement} Created option div
 */
export function createCustomOption(text, value, selected = false) {
    return createElement('div', {
        className: `custom-select-option ${selected ? 'selected' : ''}`,
        dataset: { value }
    }, text);
}

/**
 * Safely clear element content
 * @param {HTMLElement} element - Element to clear
 */
export function clearElement(element) {
    if (element) {
        element.innerHTML = '';
    }
}

/**
 * Safely append child to parent
 * @param {HTMLElement} parent - Parent element
 * @param {HTMLElement} child - Child element to append
 */
export function appendChild(parent, child) {
    if (parent && child) {
        parent.appendChild(child);
    }
}

/**
 * Safely remove child from parent
 * @param {HTMLElement} parent - Parent element
 * @param {HTMLElement} child - Child element to remove
 */
export function removeChild(parent, child) {
    if (parent && child && parent.contains(child)) {
        parent.removeChild(child);
    }
}

/**
 * Toggle class on element
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to toggle
 * @param {boolean} force - Force add (true) or remove (false)
 */
export function toggleClass(element, className, force = undefined) {
    if (element && element.classList) {
        return element.classList.toggle(className, force);
    }
    return false;
}

/**
 * Add class to element
 * @param {HTMLElement} element - Target element
 * @param {string|Array} classNames - Class name(s) to add
 */
export function addClass(element, classNames) {
    if (!element || !element.classList) return;

    if (Array.isArray(classNames)) {
        element.classList.add(...classNames);
    } else {
        element.classList.add(classNames);
    }
}

/**
 * Remove class from element
 * @param {HTMLElement} element - Target element
 * @param {string|Array} classNames - Class name(s) to remove
 */
export function removeClass(element, classNames) {
    if (!element || !element.classList) return;

    if (Array.isArray(classNames)) {
        element.classList.remove(...classNames);
    } else {
        element.classList.remove(classNames);
    }
}

/**
 * Check if element has class
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to check
 * @returns {boolean} True if element has class
 */
export function hasClass(element, className) {
    return element && element.classList && element.classList.contains(className);
}

/**
 * Replace classes on element (remove old, add new)
 * @param {HTMLElement} element - Target element
 * @param {string|Array} oldClasses - Classes to remove
 * @param {string|Array} newClasses - Classes to add
 */
export function replaceClasses(element, oldClasses, newClasses) {
    if (!element) return;

    removeClass(element, oldClasses);
    addClass(element, newClasses);
}

/**
 * Show element by removing 'hidden' class
 * @param {HTMLElement} element - Element to show
 */
export function showElement(element) {
    if (!element) return;
    removeClass(element, 'hidden');
}

/**
 * Hide element by adding 'hidden' class
 * @param {HTMLElement} element - Element to hide
 */
export function hideElement(element) {
    if (!element) return;
    addClass(element, 'hidden');
}

/**
 * Check if element is visible (not hidden)
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if element is visible
 */
export function isVisible(element) {
    if (!element) return false;
    return !hasClass(element, 'hidden') && element.style.display !== 'none';
}

/**
 * Set element text content safely
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text content to set
 */
export function setText(element, text) {
    if (element) {
        element.textContent = text || '';
    }
}

/**
 * Set element HTML content safely
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML content to set
 */
export function setHTML(element, html) {
    if (element) {
        element.innerHTML = html || '';
    }
}

/**
 * Get element text content safely
 * @param {HTMLElement} element - Source element
 * @returns {string} Text content or empty string
 */
export function getText(element) {
    return element ? element.textContent || '' : '';
}

/**
 * Get element value safely (for form elements)
 * @param {HTMLElement} element - Input element
 * @returns {string} Element value or empty string
 */
export function getValue(element) {
    return element && element.value !== undefined ? element.value : '';
}

/**
 * Set element value safely (for form elements)
 * @param {HTMLElement} element - Input element
 * @param {string} value - Value to set
 */
export function setValue(element, value) {
    if (element && element.value !== undefined) {
        element.value = value || '';
    }
}

/**
 * Add event listener with automatic cleanup tracking
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @param {Object} options - Event listener options
 * @returns {Function} Cleanup function to remove listener
 */
export function addEventListener(element, event, handler, options = {}) {
    if (!element || !event || !handler) return () => {};

    element.addEventListener(event, handler, options);

    // Return cleanup function
    return () => {
        element.removeEventListener(event, handler, options);
    };
}

/**
 * Remove event listener safely
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @param {Object} options - Event listener options
 */
export function removeEventListener(element, event, handler, options = {}) {
    if (element && event && handler) {
        element.removeEventListener(event, handler, options);
    }
}

/**
 * Set up click outside handler for dropdowns/modals
 * @param {HTMLElement} element - Element to watch for outside clicks
 * @param {Function} callback - Callback when clicked outside
 * @returns {Function} Cleanup function
 */
export function addClickOutsideListener(element, callback) {
    if (!element || !callback) return () => {};

    const handleClick = (event) => {
        if (!element.contains(event.target)) {
            callback(event);
        }
    };

    document.addEventListener('click', handleClick);

    return () => {
        document.removeEventListener('click', handleClick);
    };
}

/**
 * Populate select element with options
 * @param {HTMLSelectElement} selectElement - Select element
 * @param {Array} options - Array of option objects {text, value, selected}
 */
export function populateSelect(selectElement, options) {
    if (!selectElement || !Array.isArray(options)) return;

    clearElement(selectElement);

    options.forEach(opt => {
        const option = createOption(opt.text || opt.label, opt.value, opt.selected);
        appendChild(selectElement, option);
    });
}

/**
 * Populate custom dropdown with options
 * @param {HTMLElement} container - Container element
 * @param {Array} options - Array of option objects {text, value, selected}
 */
export function populateCustomDropdown(container, options) {
    if (!container || !Array.isArray(options)) return;

    clearElement(container);

    options.forEach(opt => {
        const option = createCustomOption(opt.text || opt.label, opt.value, opt.selected);
        appendChild(container, option);
    });
}

/**
 * Create and manage element visibility state
 * @param {HTMLElement} element - Element to manage
 * @returns {Object} Visibility controller
 */
export function createVisibilityController(element) {
    return {
        show: () => showElement(element),
        hide: () => hideElement(element),
        toggle: () => toggleClass(element, 'hidden'),
        isVisible: () => isVisible(element)
    };
}

/**
 * Create loading state manager for buttons
 * @param {HTMLButtonElement} button - Button element
 * @param {string} loadingText - Text to show while loading
 * @returns {Object} Loading state controller
 */
export function createLoadingState(button, loadingText = 'Loading...') {
    if (!button) return { start: () => {}, stop: () => {} };

    const originalText = getText(button);
    const originalDisabled = button.disabled;

    return {
        start: () => {
            setText(button, loadingText);
            button.disabled = true;
            addClass(button, 'loading');
        },
        stop: () => {
            setText(button, originalText);
            button.disabled = originalDisabled;
            removeClass(button, 'loading');
        }
    };
}

/**
 * Debounce function for DOM events
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay = 300) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Throttle function for scroll/resize events
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 100) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}