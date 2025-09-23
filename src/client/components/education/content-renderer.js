/**
 * Content Renderer Component
 * Renders education content with rich formatting, code highlighting, and interactive elements
 * Extracted from monolithic BitcoinGame class as part of Task 6.4
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';
import { formatDate } from '../../utils/formatters.js';

export class ContentRenderer {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Content renderer instances
        this.renderers = new Map();

        // Renderer configuration
        this.defaultOptions = {
            enableCodeHighlighting: true,
            enableMath: true,
            enableInteractiveElements: true,
            enableTableOfContents: true,
            enableReadingProgress: true,
            enableBookmarks: true,
            enableSearch: true,
            autoGenerateAnchors: true,
            sanitizeHtml: true,
            theme: 'default'
        };

        // Content types and processors
        this.contentProcessors = {
            markdown: this.processMarkdown.bind(this),
            html: this.processHtml.bind(this),
            text: this.processText.bind(this),
            json: this.processJsonContent.bind(this)
        };

        // Interactive element handlers
        this.interactiveHandlers = {
            quiz: this.handleQuiz.bind(this),
            calculator: this.handleCalculator.bind(this),
            chart: this.handleChart.bind(this),
            comparison: this.handleComparison.bind(this)
        };

        // Reading state
        this.readingState = new Map();
    }

    /**
     * Initialize the content renderer component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('ContentRenderer already initialized');
            return;
        }

        try {
            // Merge options
            this.defaultOptions = { ...this.defaultOptions, ...options };

            // Enhance existing content renderers
            this.enhanceExistingRenderers();

            // Set up global event listeners
            this.setupGlobalEventListeners();

            this.isInitialized = true;
            console.log('ContentRenderer initialized successfully');

        } catch (error) {
            console.error('Failed to initialize content renderer:', error);
        }
    }

    /**
     * Enhance existing content renderer elements in the DOM
     */
    enhanceExistingRenderers() {
        const existingRenderers = document.querySelectorAll('[data-content-renderer], .content-renderer');
        existingRenderers.forEach(renderer => {
            if (!renderer.dataset.rendererEnhanced) {
                this.enhanceRenderer(renderer);
            }
        });
    }

    /**
     * Set up global event listeners
     */
    setupGlobalEventListeners() {
        // Listen for content load events
        document.addEventListener('loadEducationContent', (e) => {
            if (e.detail && e.detail.content) {
                this.renderContent(e.detail.rendererId, e.detail.content);
            }
        });

        // Listen for content navigation events
        document.addEventListener('navigateToSection', (e) => {
            if (e.detail && e.detail.sectionId) {
                this.scrollToSection(e.detail.sectionId);
            }
        });
    }

    /**
     * Create a new content renderer
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Renderer options
     * @returns {string} Renderer ID
     */
    create(container, options = {}) {
        if (!container) {
            console.error('Container element is required for content renderer');
            return null;
        }

        const rendererOptions = { ...this.defaultOptions, ...options };
        const rendererId = this.generateRendererId();

        // Set up container
        this.setupRendererContainer(container, rendererOptions);

        // Create renderer structure
        this.createRendererStructure(container, rendererId);

        // Set up event listeners
        this.setupRendererEventListeners(container, rendererId);

        // Store renderer instance
        this.renderers.set(rendererId, {
            container: container,
            options: rendererOptions,
            content: null,
            currentSection: null,
            bookmarks: [],
            searchIndex: null
        });

        container.dataset.rendererId = rendererId;

        return rendererId;
    }

    /**
     * Enhance an existing renderer element
     * @param {HTMLElement} container - Renderer container element
     * @param {Object} options - Enhancement options
     */
    enhanceRenderer(container, options = {}) {
        if (!container || container.dataset.rendererEnhanced) return;

        const rendererId = this.create(container, options);
        container.dataset.rendererEnhanced = 'true';

        return rendererId;
    }

    /**
     * Set up renderer container
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Renderer options
     */
    setupRendererContainer(container, options) {
        container.classList.add('content-renderer');
        container.classList.add(`theme-${options.theme}`);

        if (options.enableReadingProgress) {
            container.classList.add('with-progress');
        }
    }

    /**
     * Create renderer HTML structure
     * @param {HTMLElement} container - Container element
     * @param {string} rendererId - Renderer ID
     */
    createRendererStructure(container, rendererId) {
        const structure = `
            <div class="content-renderer-header">
                <div class="content-toolbar">
                    ${this.renderToolbar(rendererId)}
                </div>
                ${this.defaultOptions.enableReadingProgress ? `
                    <div class="reading-progress-bar" id="progressBar-${rendererId}">
                        <div class="progress-fill"></div>
                    </div>
                ` : ''}
            </div>

            <div class="content-renderer-body">
                ${this.defaultOptions.enableTableOfContents ? `
                    <aside class="content-sidebar" id="contentSidebar-${rendererId}">
                        <div class="table-of-contents" id="tableOfContents-${rendererId}">
                            <h4>Contents</h4>
                            <div class="toc-content">
                                <div class="toc-loading">Loading...</div>
                            </div>
                        </div>

                        ${this.defaultOptions.enableBookmarks ? `
                            <div class="bookmarks-section" id="bookmarks-${rendererId}">
                                <h4>Bookmarks</h4>
                                <div class="bookmarks-list">
                                    <div class="no-bookmarks">No bookmarks yet</div>
                                </div>
                            </div>
                        ` : ''}
                    </aside>
                ` : ''}

                <main class="content-main" id="contentMain-${rendererId}">
                    <div class="content-area" id="contentArea-${rendererId}">
                        <div class="content-loading">
                            <div class="loading-spinner"></div>
                            <span>Loading content...</span>
                        </div>
                    </div>
                </main>
            </div>

            ${this.defaultOptions.enableSearch ? `
                <div class="content-search-overlay" id="searchOverlay-${rendererId}" style="display: none;">
                    <div class="search-container">
                        <input type="text" class="search-input" placeholder="Search content..." id="searchInput-${rendererId}">
                        <div class="search-results" id="searchResults-${rendererId}"></div>
                    </div>
                </div>
            ` : ''}
        `;

        container.innerHTML = structure;
    }

    /**
     * Render toolbar
     * @param {string} rendererId - Renderer ID
     * @returns {string} HTML for toolbar
     */
    renderToolbar(rendererId) {
        return `
            <div class="toolbar-section">
                <button class="btn btn-sm toolbar-btn" id="toggleSidebar-${rendererId}" title="Toggle Sidebar">
                    <span class="btn-icon">📋</span>
                </button>

                ${this.defaultOptions.enableSearch ? `
                    <button class="btn btn-sm toolbar-btn" id="openSearch-${rendererId}" title="Search Content">
                        <span class="btn-icon">🔍</span>
                    </button>
                ` : ''}

                ${this.defaultOptions.enableBookmarks ? `
                    <button class="btn btn-sm toolbar-btn" id="addBookmark-${rendererId}" title="Add Bookmark">
                        <span class="btn-icon">🔖</span>
                    </button>
                ` : ''}
            </div>

            <div class="toolbar-section">
                <button class="btn btn-sm toolbar-btn" id="printContent-${rendererId}" title="Print Content">
                    <span class="btn-icon">🖨️</span>
                </button>

                <button class="btn btn-sm toolbar-btn" id="shareContent-${rendererId}" title="Share Content">
                    <span class="btn-icon">📤</span>
                </button>

                <div class="font-size-controls">
                    <button class="btn btn-sm toolbar-btn" id="decreaseFont-${rendererId}" title="Decrease Font Size">A-</button>
                    <button class="btn btn-sm toolbar-btn" id="increaseFont-${rendererId}" title="Increase Font Size">A+</button>
                </div>
            </div>
        `;
    }

    /**
     * Set up renderer event listeners
     * @param {HTMLElement} container - Container element
     * @param {string} rendererId - Renderer ID
     */
    setupRendererEventListeners(container, rendererId) {
        // Toolbar button handlers
        this.setupToolbarHandlers(container, rendererId);

        // Content interaction handlers
        this.setupContentHandlers(container, rendererId);

        // Search handlers
        if (this.defaultOptions.enableSearch) {
            this.setupSearchHandlers(container, rendererId);
        }

        // Scroll handler for reading progress
        if (this.defaultOptions.enableReadingProgress) {
            this.setupScrollHandler(container, rendererId);
        }
    }

    /**
     * Set up toolbar button handlers
     * @param {HTMLElement} container - Container element
     * @param {string} rendererId - Renderer ID
     */
    setupToolbarHandlers(container, rendererId) {
        // Toggle sidebar
        const toggleSidebar = container.querySelector(`#toggleSidebar-${rendererId}`);
        if (toggleSidebar) {
            const cleanup = addEventListener(toggleSidebar, 'click', () => {
                this.toggleSidebar(rendererId);
            });
            this.eventListeners.push(cleanup);
        }

        // Open search
        const openSearch = container.querySelector(`#openSearch-${rendererId}`);
        if (openSearch) {
            const cleanup = addEventListener(openSearch, 'click', () => {
                this.openSearch(rendererId);
            });
            this.eventListeners.push(cleanup);
        }

        // Add bookmark
        const addBookmark = container.querySelector(`#addBookmark-${rendererId}`);
        if (addBookmark) {
            const cleanup = addEventListener(addBookmark, 'click', () => {
                this.addBookmark(rendererId);
            });
            this.eventListeners.push(cleanup);
        }

        // Print content
        const printContent = container.querySelector(`#printContent-${rendererId}`);
        if (printContent) {
            const cleanup = addEventListener(printContent, 'click', () => {
                this.printContent(rendererId);
            });
            this.eventListeners.push(cleanup);
        }

        // Share content
        const shareContent = container.querySelector(`#shareContent-${rendererId}`);
        if (shareContent) {
            const cleanup = addEventListener(shareContent, 'click', () => {
                this.shareContent(rendererId);
            });
            this.eventListeners.push(cleanup);
        }

        // Font size controls
        const decreaseFont = container.querySelector(`#decreaseFont-${rendererId}`);
        const increaseFont = container.querySelector(`#increaseFont-${rendererId}`);

        if (decreaseFont) {
            const cleanup = addEventListener(decreaseFont, 'click', () => {
                this.adjustFontSize(rendererId, -1);
            });
            this.eventListeners.push(cleanup);
        }

        if (increaseFont) {
            const cleanup = addEventListener(increaseFont, 'click', () => {
                this.adjustFontSize(rendererId, 1);
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up content interaction handlers
     * @param {HTMLElement} container - Container element
     * @param {string} rendererId - Renderer ID
     */
    setupContentHandlers(container, rendererId) {
        const contentArea = container.querySelector(`#contentArea-${rendererId}`);
        if (!contentArea) return;

        // Delegated event handling for interactive elements
        const clickHandler = (e) => {
            const interactiveElement = e.target.closest('[data-interactive]');
            if (interactiveElement) {
                e.preventDefault();
                this.handleInteractiveElement(interactiveElement, rendererId);
            }

            // Handle anchor links
            const anchorLink = e.target.closest('a[href^="#"]');
            if (anchorLink) {
                e.preventDefault();
                const targetId = anchorLink.getAttribute('href').substring(1);
                this.scrollToSection(targetId, rendererId);
            }
        };

        const cleanup = addEventListener(contentArea, 'click', clickHandler);
        this.eventListeners.push(cleanup);
    }

    /**
     * Set up search handlers
     * @param {HTMLElement} container - Container element
     * @param {string} rendererId - Renderer ID
     */
    setupSearchHandlers(container, rendererId) {
        const searchInput = container.querySelector(`#searchInput-${rendererId}`);
        const searchOverlay = container.querySelector(`#searchOverlay-${rendererId}`);

        if (searchInput) {
            // Search input handler with debounce
            let searchTimeout;
            const searchHandler = () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performSearch(rendererId, searchInput.value);
                }, 300);
            };

            const cleanup1 = addEventListener(searchInput, 'input', searchHandler);
            this.eventListeners.push(cleanup1);

            // Escape key to close search
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    this.closeSearch(rendererId);
                }
            };

            const cleanup2 = addEventListener(searchInput, 'keydown', escapeHandler);
            this.eventListeners.push(cleanup2);
        }

        // Close search on overlay click
        if (searchOverlay) {
            const cleanup = addEventListener(searchOverlay, 'click', (e) => {
                if (e.target === searchOverlay) {
                    this.closeSearch(rendererId);
                }
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up scroll handler for reading progress
     * @param {HTMLElement} container - Container element
     * @param {string} rendererId - Renderer ID
     */
    setupScrollHandler(container, rendererId) {
        const contentMain = container.querySelector(`#contentMain-${rendererId}`);
        if (!contentMain) return;

        const scrollHandler = () => {
            this.updateReadingProgress(rendererId);
        };

        const cleanup = addEventListener(contentMain, 'scroll', scrollHandler);
        this.eventListeners.push(cleanup);
    }

    /**
     * Render content
     * @param {string} rendererId - Renderer ID
     * @param {Object} content - Content to render
     */
    async renderContent(rendererId, content) {
        const rendererData = this.renderers.get(rendererId);
        if (!rendererData) return;

        try {
            this.showLoadingState(rendererId);

            // Store content
            rendererData.content = content;

            // Process content based on type
            const processedContent = await this.processContent(content);

            // Render to DOM
            this.renderProcessedContent(rendererId, processedContent);

            // Generate table of contents
            if (this.defaultOptions.enableTableOfContents) {
                this.generateTableOfContents(rendererId);
            }

            // Build search index
            if (this.defaultOptions.enableSearch) {
                this.buildSearchIndex(rendererId);
            }

            // Initialize reading state
            this.initializeReadingState(rendererId);

            this.hideLoadingState(rendererId);

            // Emit content rendered event
            this.emitEvent('contentRendered', { rendererId, content });

        } catch (error) {
            console.error('Failed to render content:', error);
            this.showErrorState(rendererId);
        }
    }

    /**
     * Process content based on type
     * @param {Object} content - Content object
     * @returns {string} Processed HTML content
     */
    async processContent(content) {
        const processor = this.contentProcessors[content.type] || this.contentProcessors.text;
        return await processor(content);
    }

    /**
     * Process Markdown content
     * @param {Object} content - Content object
     * @returns {string} Processed HTML
     */
    async processMarkdown(content) {
        // Basic Markdown processing (would use a proper library in production)
        let html = content.body || '';

        // Headers
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

        // Bold and italic
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Code blocks
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');

        // Links
        html = html.replace(/\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2">$1</a>');

        // Paragraphs
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';

        // Auto-generate anchors if enabled
        if (this.defaultOptions.autoGenerateAnchors) {
            html = this.addAnchorIds(html);
        }

        return html;
    }

    /**
     * Process HTML content
     * @param {Object} content - Content object
     * @returns {string} Processed HTML
     */
    async processHtml(content) {
        let html = content.body || '';

        if (this.defaultOptions.sanitizeHtml) {
            // Basic HTML sanitization (would use a proper library in production)
            html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            html = html.replace(/on\w+="[^"]*"/g, '');
        }

        // Auto-generate anchors if enabled
        if (this.defaultOptions.autoGenerateAnchors) {
            html = this.addAnchorIds(html);
        }

        return html;
    }

    /**
     * Process plain text content
     * @param {Object} content - Content object
     * @returns {string} Processed HTML
     */
    async processText(content) {
        const text = content.body || '';
        const html = text.replace(/\n/g, '<br>');
        return `<div class="text-content">${html}</div>`;
    }

    /**
     * Process JSON content
     * @param {Object} content - Content object
     * @returns {string} Processed HTML
     */
    async processJsonContent(content) {
        // Handle structured content like lessons, quizzes, etc.
        const data = typeof content.body === 'string' ? JSON.parse(content.body) : content.body;

        let html = '';

        if (data.sections) {
            data.sections.forEach(section => {
                html += this.renderSection(section);
            });
        }

        return html;
    }

    /**
     * Render a content section
     * @param {Object} section - Section data
     * @returns {string} HTML for section
     */
    renderSection(section) {
        let sectionHtml = `<section class="content-section" id="${section.id || ''}">`;

        if (section.title) {
            sectionHtml += `<h2>${section.title}</h2>`;
        }

        if (section.content) {
            sectionHtml += `<div class="section-content">${section.content}</div>`;
        }

        if (section.interactive) {
            sectionHtml += this.renderInteractiveElement(section.interactive);
        }

        if (section.subsections) {
            section.subsections.forEach(subsection => {
                sectionHtml += this.renderSection(subsection);
            });
        }

        sectionHtml += '</section>';

        return sectionHtml;
    }

    /**
     * Render interactive element
     * @param {Object} interactive - Interactive element data
     * @returns {string} HTML for interactive element
     */
    renderInteractiveElement(interactive) {
        const type = interactive.type;
        const data = interactive.data || {};

        switch (type) {
            case 'quiz':
                return this.renderQuiz(data);
            case 'calculator':
                return this.renderCalculator(data);
            case 'chart':
                return this.renderChart(data);
            case 'comparison':
                return this.renderComparison(data);
            default:
                return '';
        }
    }

    /**
     * Render quiz element
     * @param {Object} data - Quiz data
     * @returns {string} HTML for quiz
     */
    renderQuiz(data) {
        let quizHtml = `<div class="interactive-quiz" data-interactive="quiz">`;
        quizHtml += `<h4>${data.question}</h4>`;
        quizHtml += '<div class="quiz-options">';

        data.options.forEach((option, index) => {
            quizHtml += `
                <label class="quiz-option">
                    <input type="radio" name="quiz-${data.id}" value="${index}">
                    <span>${option}</span>
                </label>
            `;
        });

        quizHtml += '</div>';
        quizHtml += '<button class="btn btn-primary check-answer">Check Answer</button>';
        quizHtml += '<div class="quiz-feedback" style="display: none;"></div>';
        quizHtml += '</div>';

        return quizHtml;
    }

    /**
     * Render calculator element
     * @param {Object} data - Calculator data
     * @returns {string} HTML for calculator
     */
    renderCalculator(data) {
        return `
            <div class="interactive-calculator" data-interactive="calculator">
                <h4>${data.title}</h4>
                <div class="calculator-inputs">
                    ${data.inputs.map(input => `
                        <div class="input-group">
                            <label>${input.label}</label>
                            <input type="number" data-field="${input.field}" placeholder="${input.placeholder || ''}">
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-primary calculate">Calculate</button>
                <div class="calculator-result"></div>
            </div>
        `;
    }

    /**
     * Render chart element
     * @param {Object} data - Chart data
     * @returns {string} HTML for chart
     */
    renderChart(data) {
        return `
            <div class="interactive-chart" data-interactive="chart">
                <h4>${data.title}</h4>
                <canvas class="chart-canvas" data-chart-config='${JSON.stringify(data)}'></canvas>
            </div>
        `;
    }

    /**
     * Render comparison element
     * @param {Object} data - Comparison data
     * @returns {string} HTML for comparison
     */
    renderComparison(data) {
        return `
            <div class="interactive-comparison" data-interactive="comparison">
                <h4>${data.title}</h4>
                <div class="comparison-table">
                    <table>
                        <thead>
                            <tr>
                                ${data.headers.map(header => `<th>${header}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.rows.map(row => `
                                <tr>
                                    ${row.map(cell => `<td>${cell}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Add anchor IDs to headings
     * @param {string} html - HTML content
     * @returns {string} HTML with anchor IDs
     */
    addAnchorIds(html) {
        return html.replace(/<h([1-6])>(.*?)<\/h[1-6]>/g, (match, level, content) => {
            const id = content.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .trim();
            return `<h${level} id="${id}">${content}</h${level}>`;
        });
    }

    /**
     * Render processed content to DOM
     * @param {string} rendererId - Renderer ID
     * @param {string} html - Processed HTML content
     */
    renderProcessedContent(rendererId, html) {
        const contentArea = getElementById(`contentArea-${rendererId}`);
        if (contentArea) {
            contentArea.innerHTML = html;

            // Apply code highlighting if enabled
            if (this.defaultOptions.enableCodeHighlighting) {
                this.highlightCode(contentArea);
            }

            // Process interactive elements
            if (this.defaultOptions.enableInteractiveElements) {
                this.initializeInteractiveElements(contentArea, rendererId);
            }
        }
    }

    /**
     * Apply code highlighting
     * @param {HTMLElement} container - Container element
     */
    highlightCode(container) {
        const codeBlocks = container.querySelectorAll('pre code, code');
        codeBlocks.forEach(block => {
            block.classList.add('highlighted');
            // Basic syntax highlighting would be applied here
        });
    }

    /**
     * Initialize interactive elements
     * @param {HTMLElement} container - Container element
     * @param {string} rendererId - Renderer ID
     */
    initializeInteractiveElements(container, rendererId) {
        const interactiveElements = container.querySelectorAll('[data-interactive]');
        interactiveElements.forEach(element => {
            const type = element.dataset.interactive;
            if (this.interactiveHandlers[type]) {
                this.interactiveHandlers[type](element, rendererId);
            }
        });
    }

    /**
     * Handle interactive element interaction
     * @param {HTMLElement} element - Interactive element
     * @param {string} rendererId - Renderer ID
     */
    handleInteractiveElement(element, rendererId) {
        const type = element.dataset.interactive;
        if (this.interactiveHandlers[type]) {
            this.interactiveHandlers[type](element, rendererId);
        }
    }

    /**
     * Handle quiz interaction
     * @param {HTMLElement} element - Quiz element
     * @param {string} rendererId - Renderer ID
     */
    handleQuiz(element, rendererId) {
        const checkButton = element.querySelector('.check-answer');
        if (!checkButton) return;

        const cleanup = addEventListener(checkButton, 'click', () => {
            const selectedOption = element.querySelector('input[type="radio"]:checked');
            const feedback = element.querySelector('.quiz-feedback');

            if (selectedOption && feedback) {
                const isCorrect = selectedOption.value === '0'; // Assuming first option is correct
                feedback.innerHTML = isCorrect ?
                    '<div class="correct">✅ Correct!</div>' :
                    '<div class="incorrect">❌ Incorrect. Try again!</div>';
                showElement(feedback);
            }
        });

        this.eventListeners.push(cleanup);
    }

    /**
     * Handle calculator interaction
     * @param {HTMLElement} element - Calculator element
     * @param {string} rendererId - Renderer ID
     */
    handleCalculator(element, rendererId) {
        const calculateButton = element.querySelector('.calculate');
        if (!calculateButton) return;

        const cleanup = addEventListener(calculateButton, 'click', () => {
            const inputs = element.querySelectorAll('input[type="number"]');
            const result = element.querySelector('.calculator-result');

            // Perform basic calculation (would be more sophisticated in production)
            let total = 0;
            inputs.forEach(input => {
                total += parseFloat(input.value) || 0;
            });

            if (result) {
                result.innerHTML = `<div class="result">Result: ${total}</div>`;
            }
        });

        this.eventListeners.push(cleanup);
    }

    /**
     * Handle chart interaction
     * @param {HTMLElement} element - Chart element
     * @param {string} rendererId - Renderer ID
     */
    handleChart(element, rendererId) {
        const canvas = element.querySelector('.chart-canvas');
        if (!canvas) return;

        // Initialize chart (would use a charting library in production)
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f97316';
        ctx.fillRect(10, 10, 100, 50);
        ctx.fillStyle = '#000';
        ctx.fillText('Sample Chart', 20, 35);
    }

    /**
     * Handle comparison interaction
     * @param {HTMLElement} element - Comparison element
     * @param {string} rendererId - Renderer ID
     */
    handleComparison(element, rendererId) {
        // Add interactive features to comparison table
        const rows = element.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cleanup = addEventListener(row, 'click', () => {
                rows.forEach(r => r.classList.remove('highlighted'));
                row.classList.add('highlighted');
            });
            this.eventListeners.push(cleanup);
        });
    }

    /**
     * Generate table of contents
     * @param {string} rendererId - Renderer ID
     */
    generateTableOfContents(rendererId) {
        const contentArea = getElementById(`contentArea-${rendererId}`);
        const tocContent = getElementById(`tableOfContents-${rendererId}`)?.querySelector('.toc-content');

        if (!contentArea || !tocContent) return;

        const headings = contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6');

        if (headings.length === 0) {
            tocContent.innerHTML = '<div class="no-headings">No headings found</div>';
            return;
        }

        let tocHtml = '<ul class="toc-list">';
        headings.forEach(heading => {
            const level = parseInt(heading.tagName.charAt(1));
            const text = heading.textContent;
            const id = heading.id || text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

            if (!heading.id) {
                heading.id = id;
            }

            tocHtml += `
                <li class="toc-item toc-level-${level}">
                    <a href="#${id}" class="toc-link" data-target="${id}">
                        ${text}
                    </a>
                </li>
            `;
        });
        tocHtml += '</ul>';

        tocContent.innerHTML = tocHtml;

        // Set up TOC link handlers
        const tocLinks = tocContent.querySelectorAll('.toc-link');
        tocLinks.forEach(link => {
            const cleanup = addEventListener(link, 'click', (e) => {
                e.preventDefault();
                const targetId = link.dataset.target;
                this.scrollToSection(targetId, rendererId);
            });
            this.eventListeners.push(cleanup);
        });
    }

    /**
     * Build search index
     * @param {string} rendererId - Renderer ID
     */
    buildSearchIndex(rendererId) {
        const rendererData = this.renderers.get(rendererId);
        const contentArea = getElementById(`contentArea-${rendererId}`);

        if (!rendererData || !contentArea) return;

        const textContent = contentArea.textContent || '';
        const words = textContent.toLowerCase().split(/\s+/).filter(word => word.length > 2);

        rendererData.searchIndex = new Map();

        words.forEach((word, index) => {
            if (!rendererData.searchIndex.has(word)) {
                rendererData.searchIndex.set(word, []);
            }
            rendererData.searchIndex.get(word).push(index);
        });
    }

    /**
     * Initialize reading state
     * @param {string} rendererId - Renderer ID
     */
    initializeReadingState(rendererId) {
        this.readingState.set(rendererId, {
            startTime: Date.now(),
            scrollProgress: 0,
            currentSection: null,
            timeSpent: 0
        });
    }

    /**
     * Scroll to section
     * @param {string} sectionId - Section ID
     * @param {string} rendererId - Renderer ID
     */
    scrollToSection(sectionId, rendererId) {
        const targetElement = document.getElementById(sectionId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });

            // Update current section
            const rendererData = this.renderers.get(rendererId);
            if (rendererData) {
                rendererData.currentSection = sectionId;
            }

            // Emit navigation event
            this.emitEvent('sectionNavigated', { rendererId, sectionId });
        }
    }

    /**
     * Update reading progress
     * @param {string} rendererId - Renderer ID
     */
    updateReadingProgress(rendererId) {
        const contentMain = getElementById(`contentMain-${rendererId}`);
        const progressBar = getElementById(`progressBar-${rendererId}`)?.querySelector('.progress-fill');

        if (!contentMain || !progressBar) return;

        const scrollTop = contentMain.scrollTop;
        const scrollHeight = contentMain.scrollHeight - contentMain.clientHeight;
        const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

        progressBar.style.width = `${Math.min(progress, 100)}%`;

        // Update reading state
        const readingState = this.readingState.get(rendererId);
        if (readingState) {
            readingState.scrollProgress = progress;
            readingState.timeSpent = Date.now() - readingState.startTime;
        }
    }

    /**
     * Toggle sidebar
     * @param {string} rendererId - Renderer ID
     */
    toggleSidebar(rendererId) {
        const sidebar = getElementById(`contentSidebar-${rendererId}`);
        if (sidebar) {
            sidebar.classList.toggle('hidden');
        }
    }

    /**
     * Open search
     * @param {string} rendererId - Renderer ID
     */
    openSearch(rendererId) {
        const searchOverlay = getElementById(`searchOverlay-${rendererId}`);
        const searchInput = getElementById(`searchInput-${rendererId}`);

        if (searchOverlay && searchInput) {
            showElement(searchOverlay);
            searchInput.focus();
        }
    }

    /**
     * Close search
     * @param {string} rendererId - Renderer ID
     */
    closeSearch(rendererId) {
        const searchOverlay = getElementById(`searchOverlay-${rendererId}`);
        const searchInput = getElementById(`searchInput-${rendererId}`);

        if (searchOverlay) {
            hideElement(searchOverlay);
        }

        if (searchInput) {
            searchInput.value = '';
        }
    }

    /**
     * Perform search
     * @param {string} rendererId - Renderer ID
     * @param {string} query - Search query
     */
    performSearch(rendererId, query) {
        const rendererData = this.renderers.get(rendererId);
        const searchResults = getElementById(`searchResults-${rendererId}`);

        if (!rendererData || !searchResults || !query.trim()) {
            if (searchResults) searchResults.innerHTML = '';
            return;
        }

        const results = this.searchContent(rendererId, query.toLowerCase());
        this.displaySearchResults(rendererId, results, query);
    }

    /**
     * Search content
     * @param {string} rendererId - Renderer ID
     * @param {string} query - Search query
     * @returns {Array} Search results
     */
    searchContent(rendererId, query) {
        const rendererData = this.renderers.get(rendererId);
        const contentArea = getElementById(`contentArea-${rendererId}`);

        if (!rendererData || !contentArea) return [];

        const results = [];
        const textContent = contentArea.textContent || '';
        const sentences = textContent.split(/[.!?]+/);

        sentences.forEach((sentence, index) => {
            if (sentence.toLowerCase().includes(query)) {
                results.push({
                    text: sentence.trim(),
                    index: index,
                    relevance: this.calculateRelevance(sentence, query)
                });
            }
        });

        return results.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
    }

    /**
     * Calculate search relevance
     * @param {string} text - Text to analyze
     * @param {string} query - Search query
     * @returns {number} Relevance score
     */
    calculateRelevance(text, query) {
        const lowerText = text.toLowerCase();
        const queryWords = query.split(/\s+/);
        let score = 0;

        queryWords.forEach(word => {
            const occurrences = (lowerText.match(new RegExp(word, 'g')) || []).length;
            score += occurrences;
        });

        return score;
    }

    /**
     * Display search results
     * @param {string} rendererId - Renderer ID
     * @param {Array} results - Search results
     * @param {string} query - Search query
     */
    displaySearchResults(rendererId, results, query) {
        const searchResults = getElementById(`searchResults-${rendererId}`);
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }

        let resultsHtml = '<div class="search-results-list">';
        results.forEach((result, index) => {
            const highlightedText = this.highlightSearchQuery(result.text, query);
            resultsHtml += `
                <div class="search-result-item" data-result-index="${index}">
                    <div class="result-text">${highlightedText}</div>
                </div>
            `;
        });
        resultsHtml += '</div>';

        searchResults.innerHTML = resultsHtml;
    }

    /**
     * Highlight search query in text
     * @param {string} text - Text to highlight
     * @param {string} query - Search query
     * @returns {string} Highlighted text
     */
    highlightSearchQuery(text, query) {
        const queryWords = query.split(/\s+/);
        let highlightedText = text;

        queryWords.forEach(word => {
            const regex = new RegExp(`(${word})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
        });

        return highlightedText;
    }

    /**
     * Add bookmark
     * @param {string} rendererId - Renderer ID
     */
    addBookmark(rendererId) {
        const rendererData = this.renderers.get(rendererId);
        if (!rendererData) return;

        const currentSection = rendererData.currentSection || 'top';
        const timestamp = new Date();

        const bookmark = {
            id: Date.now(),
            section: currentSection,
            timestamp: timestamp,
            title: this.getCurrentSectionTitle(rendererId) || 'Bookmark'
        };

        rendererData.bookmarks.push(bookmark);
        this.updateBookmarksList(rendererId);

        this.services.notificationService?.showSuccess('Bookmark added');
    }

    /**
     * Get current section title
     * @param {string} rendererId - Renderer ID
     * @returns {string} Section title
     */
    getCurrentSectionTitle(rendererId) {
        const rendererData = this.renderers.get(rendererId);
        if (!rendererData || !rendererData.currentSection) return null;

        const sectionElement = document.getElementById(rendererData.currentSection);
        return sectionElement ? sectionElement.textContent : null;
    }

    /**
     * Update bookmarks list
     * @param {string} rendererId - Renderer ID
     */
    updateBookmarksList(rendererId) {
        const rendererData = this.renderers.get(rendererId);
        const bookmarksList = getElementById(`bookmarks-${rendererId}`)?.querySelector('.bookmarks-list');

        if (!rendererData || !bookmarksList) return;

        if (rendererData.bookmarks.length === 0) {
            bookmarksList.innerHTML = '<div class="no-bookmarks">No bookmarks yet</div>';
            return;
        }

        let bookmarksHtml = '';
        rendererData.bookmarks.forEach(bookmark => {
            bookmarksHtml += `
                <div class="bookmark-item" data-bookmark-id="${bookmark.id}">
                    <div class="bookmark-title">${bookmark.title}</div>
                    <div class="bookmark-time">${formatDate(bookmark.timestamp)}</div>
                    <button class="btn btn-sm remove-bookmark" data-bookmark-id="${bookmark.id}">×</button>
                </div>
            `;
        });

        bookmarksList.innerHTML = bookmarksHtml;

        // Set up bookmark click handlers
        const bookmarkItems = bookmarksList.querySelectorAll('.bookmark-item');
        bookmarkItems.forEach(item => {
            const cleanup = addEventListener(item, 'click', (e) => {
                if (!e.target.classList.contains('remove-bookmark')) {
                    const bookmarkId = item.dataset.bookmarkId;
                    const bookmark = rendererData.bookmarks.find(b => b.id.toString() === bookmarkId);
                    if (bookmark) {
                        this.scrollToSection(bookmark.section, rendererId);
                    }
                }
            });
            this.eventListeners.push(cleanup);
        });

        // Set up remove bookmark handlers
        const removeButtons = bookmarksList.querySelectorAll('.remove-bookmark');
        removeButtons.forEach(button => {
            const cleanup = addEventListener(button, 'click', (e) => {
                e.stopPropagation();
                const bookmarkId = button.dataset.bookmarkId;
                this.removeBookmark(rendererId, bookmarkId);
            });
            this.eventListeners.push(cleanup);
        });
    }

    /**
     * Remove bookmark
     * @param {string} rendererId - Renderer ID
     * @param {string} bookmarkId - Bookmark ID
     */
    removeBookmark(rendererId, bookmarkId) {
        const rendererData = this.renderers.get(rendererId);
        if (!rendererData) return;

        rendererData.bookmarks = rendererData.bookmarks.filter(
            bookmark => bookmark.id.toString() !== bookmarkId
        );

        this.updateBookmarksList(rendererId);
    }

    /**
     * Print content
     * @param {string} rendererId - Renderer ID
     */
    printContent(rendererId) {
        const contentArea = getElementById(`contentArea-${rendererId}`);
        if (!contentArea) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Education Content</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1, h2, h3 { color: #f97316; }
                        code { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; }
                        pre { background: #f3f4f6; padding: 10px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    ${contentArea.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    /**
     * Share content
     * @param {string} rendererId - Renderer ID
     */
    shareContent(rendererId) {
        const rendererData = this.renderers.get(rendererId);
        if (!rendererData || !rendererData.content) return;

        if (navigator.share) {
            navigator.share({
                title: rendererData.content.title || 'Education Content',
                text: rendererData.content.description || 'Check out this educational content',
                url: window.location.href
            });
        } else {
            // Fallback: copy URL to clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.services.notificationService?.showSuccess('Link copied to clipboard');
            });
        }
    }

    /**
     * Adjust font size
     * @param {string} rendererId - Renderer ID
     * @param {number} delta - Font size adjustment (-1 or 1)
     */
    adjustFontSize(rendererId, delta) {
        const contentArea = getElementById(`contentArea-${rendererId}`);
        if (!contentArea) return;

        const currentSize = parseInt(getComputedStyle(contentArea).fontSize) || 16;
        const newSize = Math.max(12, Math.min(24, currentSize + (delta * 2)));

        contentArea.style.fontSize = `${newSize}px`;
    }

    /**
     * Show loading state
     * @param {string} rendererId - Renderer ID
     */
    showLoadingState(rendererId) {
        const contentArea = getElementById(`contentArea-${rendererId}`);
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="content-loading">
                    <div class="loading-spinner"></div>
                    <span>Loading content...</span>
                </div>
            `;
        }
    }

    /**
     * Hide loading state
     * @param {string} rendererId - Renderer ID
     */
    hideLoadingState(rendererId) {
        // Loading state will be replaced by content
    }

    /**
     * Show error state
     * @param {string} rendererId - Renderer ID
     */
    showErrorState(rendererId) {
        const contentArea = getElementById(`contentArea-${rendererId}`);
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="content-error">
                    <div class="error-icon">⚠️</div>
                    <h3>Failed to Load Content</h3>
                    <p>Unable to load the educational content. Please try again.</p>
                    <button class="btn btn-primary retry-load" data-renderer-id="${rendererId}">Retry</button>
                </div>
            `;

            // Set up retry button
            const retryBtn = contentArea.querySelector('.retry-load');
            if (retryBtn) {
                const cleanup = addEventListener(retryBtn, 'click', () => {
                    const rendererData = this.renderers.get(rendererId);
                    if (rendererData && rendererData.content) {
                        this.renderContent(rendererId, rendererData.content);
                    }
                });
                this.eventListeners.push(cleanup);
            }
        }
    }

    /**
     * Generate unique renderer ID
     * @returns {string} Renderer ID
     */
    generateRendererId() {
        return 'content_renderer_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get renderer data
     * @param {string} rendererId - Renderer ID
     * @returns {Object} Renderer data
     */
    getRendererData(rendererId) {
        return this.renderers.get(rendererId);
    }

    /**
     * Get reading state
     * @param {string} rendererId - Renderer ID
     * @returns {Object} Reading state
     */
    getReadingState(rendererId) {
        return this.readingState.get(rendererId);
    }

    /**
     * Remove renderer
     * @param {string} rendererId - Renderer ID
     */
    removeRenderer(rendererId) {
        this.renderers.delete(rendererId);
        this.readingState.delete(rendererId);
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    emitEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...detail, component: 'ContentRenderer' }
        });
        document.dispatchEvent(event);
    }

    /**
     * Destroy the content renderer component
     */
    destroy() {
        console.log('Destroying content renderer component');

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up content renderer event listener:', error);
            }
        });
        this.eventListeners = [];

        // Clear renderer instances
        this.renderers.clear();
        this.readingState.clear();

        // Reset state
        this.isInitialized = false;

        console.log('Content renderer component destroyed');
    }
}

// Create and export singleton instance
export const contentRenderer = new ContentRenderer();

// Convenience functions
export function createContentRenderer(container, options = {}) {
    return contentRenderer.create(container, options);
}

export function renderContent(rendererId, content) {
    contentRenderer.renderContent(rendererId, content);
}

export default contentRenderer;