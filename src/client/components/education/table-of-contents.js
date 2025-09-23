/**
 * Table of Contents Component
 * Education navigation with hierarchical content structure and progress tracking
 * Extracted from monolithic BitcoinGame class as part of Task 6.4
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';
import { formatDate } from '../../utils/formatters.js';

export class TableOfContents {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // TOC instances
        this.tocInstances = new Map();

        // TOC configuration
        this.defaultOptions = {
            collapsible: true,
            showProgress: true,
            showEstimatedTime: true,
            showCompletionStatus: true,
            enableSearch: true,
            enableBookmarks: true,
            autoExpand: true,
            stickyHeader: true,
            showNumbers: true,
            maxDepth: 6
        };

        // Progress tracking
        this.progressData = new Map();
    }

    /**
     * Initialize the table of contents component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('TableOfContents already initialized');
            return;
        }

        try {
            // Merge options
            this.defaultOptions = { ...this.defaultOptions, ...options };

            // Enhance existing TOCs
            this.enhanceExistingTOCs();

            // Set up global event listeners
            this.setupGlobalEventListeners();

            // Load progress data
            this.loadProgressData();

            this.isInitialized = true;
            console.log('TableOfContents initialized successfully');

        } catch (error) {
            console.error('Failed to initialize table of contents:', error);
        }
    }

    /**
     * Enhance existing TOC elements in the DOM
     */
    enhanceExistingTOCs() {
        const existingTOCs = document.querySelectorAll('[data-table-of-contents], .table-of-contents');
        existingTOCs.forEach(toc => {
            if (!toc.dataset.tocEnhanced) {
                this.enhanceTOC(toc);
            }
        });
    }

    /**
     * Set up global event listeners
     */
    setupGlobalEventListeners() {
        // Listen for content updates
        document.addEventListener('contentRendered', (e) => {
            if (e.detail && e.detail.rendererId) {
                this.updateTOCForContent(e.detail.rendererId);
            }
        });

        // Listen for section navigation
        document.addEventListener('sectionNavigated', (e) => {
            if (e.detail && e.detail.sectionId) {
                this.updateActiveSection(e.detail.sectionId);
            }
        });

        // Listen for reading progress updates
        document.addEventListener('readingProgressUpdate', (e) => {
            if (e.detail) {
                this.updateSectionProgress(e.detail.sectionId, e.detail.progress);
            }
        });
    }

    /**
     * Create a new table of contents
     * @param {HTMLElement} container - Container element
     * @param {Object} contentStructure - Content structure data
     * @param {Object} options - TOC options
     * @returns {string} TOC ID
     */
    create(container, contentStructure = null, options = {}) {
        if (!container) {
            console.error('Container element is required for table of contents');
            return null;
        }

        const tocOptions = { ...this.defaultOptions, ...options };
        const tocId = this.generateTOCId();

        // Set up container
        this.setupTOCContainer(container, tocOptions);

        // Create TOC structure
        this.createTOCStructure(container, tocId);

        // Set up event listeners
        this.setupTOCEventListeners(container, tocId);

        // Store TOC instance
        this.tocInstances.set(tocId, {
            container: container,
            options: tocOptions,
            structure: contentStructure,
            activeSection: null,
            expandedSections: new Set()
        });

        container.dataset.tocId = tocId;

        // Generate TOC content if structure provided
        if (contentStructure) {
            this.generateTOC(tocId, contentStructure);
        }

        return tocId;
    }

    /**
     * Enhance an existing TOC element
     * @param {HTMLElement} container - TOC container element
     * @param {Object} options - Enhancement options
     */
    enhanceTOC(container, options = {}) {
        if (!container || container.dataset.tocEnhanced) return;

        // Try to extract structure from existing content
        const structure = this.extractStructureFromElement(container);
        const tocId = this.create(container, structure, options);

        container.dataset.tocEnhanced = 'true';
        return tocId;
    }

    /**
     * Set up TOC container
     * @param {HTMLElement} container - Container element
     * @param {Object} options - TOC options
     */
    setupTOCContainer(container, options) {
        container.classList.add('table-of-contents');

        if (options.stickyHeader) {
            container.classList.add('sticky-header');
        }

        if (options.collapsible) {
            container.classList.add('collapsible');
        }
    }

    /**
     * Create TOC HTML structure
     * @param {HTMLElement} container - Container element
     * @param {string} tocId - TOC ID
     */
    createTOCStructure(container, tocId) {
        const structure = `
            <div class="toc-header">
                <h3 class="toc-title">Contents</h3>
                <div class="toc-controls">
                    ${this.defaultOptions.enableSearch ? `
                        <button class="btn btn-sm toc-search-btn" id="tocSearch-${tocId}" title="Search Contents">
                            🔍
                        </button>
                    ` : ''}

                    ${this.defaultOptions.collapsible ? `
                        <button class="btn btn-sm toc-collapse-btn" id="tocCollapseAll-${tocId}" title="Collapse All">
                            ⬆️
                        </button>
                        <button class="btn btn-sm toc-expand-btn" id="tocExpandAll-${tocId}" title="Expand All">
                            ⬇️
                        </button>
                    ` : ''}
                </div>
            </div>

            ${this.defaultOptions.enableSearch ? `
                <div class="toc-search" id="tocSearchBox-${tocId}" style="display: none;">
                    <input type="text" class="toc-search-input" placeholder="Search sections..." id="tocSearchInput-${tocId}">
                    <div class="toc-search-results" id="tocSearchResults-${tocId}"></div>
                </div>
            ` : ''}

            <div class="toc-content" id="tocContent-${tocId}">
                <div class="toc-loading">
                    <div class="loading-spinner"></div>
                    <span>Loading contents...</span>
                </div>
            </div>

            ${this.defaultOptions.showProgress ? `
                <div class="toc-progress-summary" id="tocProgress-${tocId}">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">
                        <span class="completed-count">0</span> / <span class="total-count">0</span> sections completed
                    </div>
                </div>
            ` : ''}
        `;

        container.innerHTML = structure;
    }

    /**
     * Set up TOC event listeners
     * @param {HTMLElement} container - Container element
     * @param {string} tocId - TOC ID
     */
    setupTOCEventListeners(container, tocId) {
        // Search button
        const searchBtn = container.querySelector(`#tocSearch-${tocId}`);
        if (searchBtn) {
            const cleanup = addEventListener(searchBtn, 'click', () => {
                this.toggleSearch(tocId);
            });
            this.eventListeners.push(cleanup);
        }

        // Search input
        const searchInput = container.querySelector(`#tocSearchInput-${tocId}`);
        if (searchInput) {
            let searchTimeout;
            const searchHandler = () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performTOCSearch(tocId, searchInput.value);
                }, 300);
            };

            const cleanup = addEventListener(searchInput, 'input', searchHandler);
            this.eventListeners.push(cleanup);
        }

        // Collapse/expand buttons
        const collapseBtn = container.querySelector(`#tocCollapseAll-${tocId}`);
        const expandBtn = container.querySelector(`#tocExpandAll-${tocId}`);

        if (collapseBtn) {
            const cleanup = addEventListener(collapseBtn, 'click', () => {
                this.collapseAll(tocId);
            });
            this.eventListeners.push(cleanup);
        }

        if (expandBtn) {
            const cleanup = addEventListener(expandBtn, 'click', () => {
                this.expandAll(tocId);
            });
            this.eventListeners.push(cleanup);
        }

        // Delegated event handling for TOC items
        const tocContent = container.querySelector(`#tocContent-${tocId}`);
        if (tocContent) {
            const clickHandler = (e) => {
                this.handleTOCClick(e, tocId);
            };

            const cleanup = addEventListener(tocContent, 'click', clickHandler);
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Generate TOC content
     * @param {string} tocId - TOC ID
     * @param {Object} structure - Content structure
     */
    generateTOC(tocId, structure) {
        const tocData = this.tocInstances.get(tocId);
        const tocContent = getElementById(`tocContent-${tocId}`);

        if (!tocData || !tocContent) return;

        // Store structure
        tocData.structure = structure;

        // Generate TOC HTML
        const tocHtml = this.renderTOCStructure(structure, tocId, 1);
        tocContent.innerHTML = tocHtml;

        // Update progress summary
        this.updateProgressSummary(tocId);

        // Auto-expand first level if enabled
        if (tocData.options.autoExpand) {
            this.expandLevel(tocId, 1);
        }
    }

    /**
     * Render TOC structure
     * @param {Object} structure - Content structure
     * @param {string} tocId - TOC ID
     * @param {number} level - Current nesting level
     * @returns {string} HTML for TOC structure
     */
    renderTOCStructure(structure, tocId, level = 1) {
        if (!structure.sections || level > this.defaultOptions.maxDepth) {
            return '';
        }

        let html = `<ul class="toc-list toc-level-${level}">`;

        structure.sections.forEach((section, index) => {
            const sectionId = section.id || `section-${level}-${index}`;
            const hasChildren = section.sections && section.sections.length > 0;
            const progress = this.getSectionProgress(sectionId);
            const isCompleted = progress === 100;
            const estimatedTime = section.estimatedTime || this.calculateEstimatedTime(section);

            html += `
                <li class="toc-item ${isCompleted ? 'completed' : ''}" data-section-id="${sectionId}">
                    <div class="toc-item-content">
                        ${hasChildren && this.defaultOptions.collapsible ? `
                            <button class="toc-toggle" data-action="toggle" title="Toggle section">
                                <span class="toggle-icon">▶</span>
                            </button>
                        ` : ''}

                        <div class="toc-link-wrapper">
                            <a href="#${sectionId}" class="toc-link" data-action="navigate" data-section-id="${sectionId}">
                                ${this.defaultOptions.showNumbers ? `
                                    <span class="toc-number">${this.generateSectionNumber(level, index + 1)}</span>
                                ` : ''}

                                <span class="toc-text">${section.title}</span>

                                ${this.defaultOptions.showCompletionStatus ? `
                                    <span class="toc-status ${isCompleted ? 'completed' : 'incomplete'}">
                                        ${isCompleted ? '✅' : '⭕'}
                                    </span>
                                ` : ''}
                            </a>

                            ${this.defaultOptions.showEstimatedTime && estimatedTime ? `
                                <span class="toc-time">${this.formatEstimatedTime(estimatedTime)}</span>
                            ` : ''}

                            ${this.defaultOptions.showProgress && progress > 0 ? `
                                <div class="toc-progress">
                                    <div class="progress-bar-mini">
                                        <div class="progress-fill" style="width: ${progress}%"></div>
                                    </div>
                                    <span class="progress-percent">${Math.round(progress)}%</span>
                                </div>
                            ` : ''}
                        </div>

                        ${this.defaultOptions.enableBookmarks ? `
                            <button class="toc-bookmark" data-action="bookmark" data-section-id="${sectionId}" title="Bookmark section">
                                🔖
                            </button>
                        ` : ''}
                    </div>

                    ${hasChildren ? `
                        <div class="toc-subsections" style="display: none;">
                            ${this.renderTOCStructure(section, tocId, level + 1)}
                        </div>
                    ` : ''}
                </li>
            `;
        });

        html += '</ul>';
        return html;
    }

    /**
     * Handle TOC click events
     * @param {Event} e - Click event
     * @param {string} tocId - TOC ID
     */
    handleTOCClick(e, tocId) {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;

        e.preventDefault();

        switch (action) {
            case 'navigate':
                this.handleNavigation(e.target, tocId);
                break;
            case 'toggle':
                this.handleToggle(e.target, tocId);
                break;
            case 'bookmark':
                this.handleBookmark(e.target, tocId);
                break;
        }
    }

    /**
     * Handle navigation click
     * @param {HTMLElement} element - Clicked element
     * @param {string} tocId - TOC ID
     */
    handleNavigation(element, tocId) {
        const sectionId = element.dataset.sectionId;
        if (!sectionId) return;

        // Update active section
        this.setActiveSection(tocId, sectionId);

        // Emit navigation event
        this.emitEvent('tocNavigate', { tocId, sectionId });

        // Navigate to section (scroll or route change)
        this.navigateToSection(sectionId);
    }

    /**
     * Handle toggle click
     * @param {HTMLElement} element - Clicked element
     * @param {string} tocId - TOC ID
     */
    handleToggle(element, tocId) {
        const tocItem = element.closest('.toc-item');
        const sectionId = tocItem.dataset.sectionId;
        const subsections = tocItem.querySelector('.toc-subsections');

        if (!subsections) return;

        const isExpanded = subsections.style.display !== 'none';

        if (isExpanded) {
            this.collapseSection(tocId, sectionId);
        } else {
            this.expandSection(tocId, sectionId);
        }
    }

    /**
     * Handle bookmark click
     * @param {HTMLElement} element - Clicked element
     * @param {string} tocId - TOC ID
     */
    handleBookmark(element, tocId) {
        const sectionId = element.dataset.sectionId;
        if (!sectionId) return;

        // Toggle bookmark
        this.toggleBookmark(tocId, sectionId);

        // Visual feedback
        element.classList.toggle('bookmarked');

        this.services.notificationService?.showSuccess('Bookmark toggled');
    }

    /**
     * Navigate to section
     * @param {string} sectionId - Section ID
     */
    navigateToSection(sectionId) {
        const targetElement = document.getElementById(sectionId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Emit event for external handling
            this.emitEvent('navigateToSection', { sectionId });
        }
    }

    /**
     * Set active section
     * @param {string} tocId - TOC ID
     * @param {string} sectionId - Section ID
     */
    setActiveSection(tocId, sectionId) {
        const tocData = this.tocInstances.get(tocId);
        const tocContent = getElementById(`tocContent-${tocId}`);

        if (!tocData || !tocContent) return;

        // Remove previous active state
        const prevActive = tocContent.querySelector('.toc-link.active');
        if (prevActive) {
            prevActive.classList.remove('active');
        }

        // Set new active state
        const newActive = tocContent.querySelector(`[data-section-id="${sectionId}"]`);
        if (newActive) {
            newActive.classList.add('active');
        }

        // Update stored active section
        tocData.activeSection = sectionId;

        // Ensure active section is visible (expand parent if needed)
        this.ensureSectionVisible(tocId, sectionId);
    }

    /**
     * Ensure section is visible in TOC
     * @param {string} tocId - TOC ID
     * @param {string} sectionId - Section ID
     */
    ensureSectionVisible(tocId, sectionId) {
        const tocContent = getElementById(`tocContent-${tocId}`);
        if (!tocContent) return;

        const sectionElement = tocContent.querySelector(`[data-section-id="${sectionId}"]`);
        if (!sectionElement) return;

        // Expand all parent sections
        let parent = sectionElement.parentElement;
        while (parent && parent !== tocContent) {
            if (parent.classList.contains('toc-subsections')) {
                const parentItem = parent.previousElementSibling;
                if (parentItem) {
                    const parentSectionId = parentItem.closest('.toc-item')?.dataset.sectionId;
                    if (parentSectionId) {
                        this.expandSection(tocId, parentSectionId);
                    }
                }
            }
            parent = parent.parentElement;
        }
    }

    /**
     * Expand section
     * @param {string} tocId - TOC ID
     * @param {string} sectionId - Section ID
     */
    expandSection(tocId, sectionId) {
        const tocData = this.tocInstances.get(tocId);
        const tocContent = getElementById(`tocContent-${tocId}`);

        if (!tocData || !tocContent) return;

        const sectionElement = tocContent.querySelector(`[data-section-id="${sectionId}"]`);
        if (!sectionElement) return;

        const subsections = sectionElement.querySelector('.toc-subsections');
        const toggleIcon = sectionElement.querySelector('.toggle-icon');

        if (subsections) {
            subsections.style.display = 'block';
            tocData.expandedSections.add(sectionId);
        }

        if (toggleIcon) {
            toggleIcon.textContent = '▼';
        }
    }

    /**
     * Collapse section
     * @param {string} tocId - TOC ID
     * @param {string} sectionId - Section ID
     */
    collapseSection(tocId, sectionId) {
        const tocData = this.tocInstances.get(tocId);
        const tocContent = getElementById(`tocContent-${tocId}`);

        if (!tocData || !tocContent) return;

        const sectionElement = tocContent.querySelector(`[data-section-id="${sectionId}"]`);
        if (!sectionElement) return;

        const subsections = sectionElement.querySelector('.toc-subsections');
        const toggleIcon = sectionElement.querySelector('.toggle-icon');

        if (subsections) {
            subsections.style.display = 'none';
            tocData.expandedSections.delete(sectionId);
        }

        if (toggleIcon) {
            toggleIcon.textContent = '▶';
        }
    }

    /**
     * Expand all sections
     * @param {string} tocId - TOC ID
     */
    expandAll(tocId) {
        const tocContent = getElementById(`tocContent-${tocId}`);
        if (!tocContent) return;

        const subsections = tocContent.querySelectorAll('.toc-subsections');
        const toggleIcons = tocContent.querySelectorAll('.toggle-icon');

        subsections.forEach(subsection => {
            subsection.style.display = 'block';
        });

        toggleIcons.forEach(icon => {
            icon.textContent = '▼';
        });

        // Update expanded sections set
        const tocData = this.tocInstances.get(tocId);
        if (tocData) {
            const allSections = tocContent.querySelectorAll('.toc-item[data-section-id]');
            allSections.forEach(section => {
                tocData.expandedSections.add(section.dataset.sectionId);
            });
        }
    }

    /**
     * Collapse all sections
     * @param {string} tocId - TOC ID
     */
    collapseAll(tocId) {
        const tocContent = getElementById(`tocContent-${tocId}`);
        if (!tocContent) return;

        const subsections = tocContent.querySelectorAll('.toc-subsections');
        const toggleIcons = tocContent.querySelectorAll('.toggle-icon');

        subsections.forEach(subsection => {
            subsection.style.display = 'none';
        });

        toggleIcons.forEach(icon => {
            icon.textContent = '▶';
        });

        // Clear expanded sections set
        const tocData = this.tocInstances.get(tocId);
        if (tocData) {
            tocData.expandedSections.clear();
        }
    }

    /**
     * Expand specific level
     * @param {string} tocId - TOC ID
     * @param {number} level - Level to expand
     */
    expandLevel(tocId, level) {
        const tocContent = getElementById(`tocContent-${tocId}`);
        if (!tocContent) return;

        const levelSections = tocContent.querySelectorAll(`.toc-level-${level} .toc-subsections`);
        const levelIcons = tocContent.querySelectorAll(`.toc-level-${level} .toggle-icon`);

        levelSections.forEach(subsection => {
            subsection.style.display = 'block';
        });

        levelIcons.forEach(icon => {
            icon.textContent = '▼';
        });
    }

    /**
     * Toggle search
     * @param {string} tocId - TOC ID
     */
    toggleSearch(tocId) {
        const searchBox = getElementById(`tocSearchBox-${tocId}`);
        const searchInput = getElementById(`tocSearchInput-${tocId}`);

        if (!searchBox) return;

        const isVisible = searchBox.style.display !== 'none';

        if (isVisible) {
            hideElement(searchBox);
            if (searchInput) searchInput.value = '';
            this.clearSearchResults(tocId);
        } else {
            showElement(searchBox);
            if (searchInput) searchInput.focus();
        }
    }

    /**
     * Perform TOC search
     * @param {string} tocId - TOC ID
     * @param {string} query - Search query
     */
    performTOCSearch(tocId, query) {
        const searchResults = getElementById(`tocSearchResults-${tocId}`);
        if (!searchResults || !query.trim()) {
            this.clearSearchResults(tocId);
            return;
        }

        const tocData = this.tocInstances.get(tocId);
        if (!tocData || !tocData.structure) return;

        const results = this.searchTOCStructure(tocData.structure, query.toLowerCase());
        this.displaySearchResults(tocId, results, query);
    }

    /**
     * Search TOC structure
     * @param {Object} structure - Content structure
     * @param {string} query - Search query
     * @param {Array} results - Results array
     * @returns {Array} Search results
     */
    searchTOCStructure(structure, query, results = []) {
        if (structure.sections) {
            structure.sections.forEach(section => {
                if (section.title.toLowerCase().includes(query)) {
                    results.push({
                        id: section.id,
                        title: section.title,
                        relevance: this.calculateRelevance(section.title, query)
                    });
                }

                if (section.sections) {
                    this.searchTOCStructure(section, query, results);
                }
            });
        }

        return results.sort((a, b) => b.relevance - a.relevance);
    }

    /**
     * Calculate search relevance
     * @param {string} text - Text to analyze
     * @param {string} query - Search query
     * @returns {number} Relevance score
     */
    calculateRelevance(text, query) {
        const lowerText = text.toLowerCase();
        let score = 0;

        // Exact match gets highest score
        if (lowerText === query) {
            score += 100;
        }

        // Word match
        if (lowerText.includes(query)) {
            score += 50;
        }

        // Partial matches
        const queryWords = query.split(/\s+/);
        queryWords.forEach(word => {
            if (lowerText.includes(word)) {
                score += 10;
            }
        });

        return score;
    }

    /**
     * Display search results
     * @param {string} tocId - TOC ID
     * @param {Array} results - Search results
     * @param {string} query - Search query
     */
    displaySearchResults(tocId, results, query) {
        const searchResults = getElementById(`tocSearchResults-${tocId}`);
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No matching sections found</div>';
            return;
        }

        let resultsHtml = '<div class="search-results-list">';
        results.forEach(result => {
            const highlightedTitle = this.highlightSearchQuery(result.title, query);
            resultsHtml += `
                <div class="search-result-item" data-section-id="${result.id}">
                    <a href="#${result.id}" class="result-link">${highlightedTitle}</a>
                </div>
            `;
        });
        resultsHtml += '</div>';

        searchResults.innerHTML = resultsHtml;

        // Set up result click handlers
        const resultItems = searchResults.querySelectorAll('.search-result-item');
        resultItems.forEach(item => {
            const cleanup = addEventListener(item, 'click', (e) => {
                e.preventDefault();
                const sectionId = item.dataset.sectionId;
                this.setActiveSection(tocId, sectionId);
                this.navigateToSection(sectionId);
                this.toggleSearch(tocId); // Close search
            });
            this.eventListeners.push(cleanup);
        });
    }

    /**
     * Clear search results
     * @param {string} tocId - TOC ID
     */
    clearSearchResults(tocId) {
        const searchResults = getElementById(`tocSearchResults-${tocId}`);
        if (searchResults) {
            searchResults.innerHTML = '';
        }
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
     * Update TOC for content
     * @param {string} rendererId - Content renderer ID
     */
    updateTOCForContent(rendererId) {
        // Find TOC associated with this content
        for (const [tocId, tocData] of this.tocInstances) {
            if (tocData.options.contentRendererId === rendererId) {
                this.extractAndUpdateStructure(tocId, rendererId);
                break;
            }
        }
    }

    /**
     * Extract and update structure from content
     * @param {string} tocId - TOC ID
     * @param {string} rendererId - Content renderer ID
     */
    extractAndUpdateStructure(tocId, rendererId) {
        const contentArea = getElementById(`contentArea-${rendererId}`);
        if (!contentArea) return;

        const headings = contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const structure = this.buildStructureFromHeadings(headings);

        this.generateTOC(tocId, structure);
    }

    /**
     * Build structure from headings
     * @param {NodeList} headings - Heading elements
     * @returns {Object} Content structure
     */
    buildStructureFromHeadings(headings) {
        const structure = { sections: [] };
        const stack = [structure];

        headings.forEach(heading => {
            const level = parseInt(heading.tagName.charAt(1));
            const title = heading.textContent;
            const id = heading.id || title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

            if (!heading.id) {
                heading.id = id;
            }

            const section = {
                id: id,
                title: title,
                level: level,
                sections: []
            };

            // Find correct parent level
            while (stack.length > level) {
                stack.pop();
            }

            // Add section to appropriate parent
            const parent = stack[stack.length - 1];
            parent.sections.push(section);

            // Add to stack for potential children
            if (stack.length === level) {
                stack.push(section);
            }
        });

        return structure;
    }

    /**
     * Update active section
     * @param {string} sectionId - Section ID
     */
    updateActiveSection(sectionId) {
        // Update all TOC instances
        for (const tocId of this.tocInstances.keys()) {
            this.setActiveSection(tocId, sectionId);
        }
    }

    /**
     * Update section progress
     * @param {string} sectionId - Section ID
     * @param {number} progress - Progress percentage
     */
    updateSectionProgress(sectionId, progress) {
        this.progressData.set(sectionId, progress);

        // Update all TOC instances
        for (const tocId of this.tocInstances.keys()) {
            this.updateSectionProgressDisplay(tocId, sectionId, progress);
            this.updateProgressSummary(tocId);
        }
    }

    /**
     * Update section progress display
     * @param {string} tocId - TOC ID
     * @param {string} sectionId - Section ID
     * @param {number} progress - Progress percentage
     */
    updateSectionProgressDisplay(tocId, sectionId, progress) {
        const tocContent = getElementById(`tocContent-${tocId}`);
        if (!tocContent) return;

        const sectionElement = tocContent.querySelector(`[data-section-id="${sectionId}"]`);
        if (!sectionElement) return;

        const progressBar = sectionElement.querySelector('.progress-fill');
        const progressPercent = sectionElement.querySelector('.progress-percent');

        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        if (progressPercent) {
            progressPercent.textContent = `${Math.round(progress)}%`;
        }

        // Update completion status
        const isCompleted = progress === 100;
        const statusIcon = sectionElement.querySelector('.toc-status');

        if (statusIcon) {
            statusIcon.textContent = isCompleted ? '✅' : '⭕';
            statusIcon.className = `toc-status ${isCompleted ? 'completed' : 'incomplete'}`;
        }

        sectionElement.classList.toggle('completed', isCompleted);
    }

    /**
     * Update progress summary
     * @param {string} tocId - TOC ID
     */
    updateProgressSummary(tocId) {
        const tocData = this.tocInstances.get(tocId);
        const progressSummary = getElementById(`tocProgress-${tocId}`);

        if (!tocData || !progressSummary) return;

        const allSections = this.getAllSections(tocData.structure);
        const completedSections = allSections.filter(section =>
            this.getSectionProgress(section.id) === 100
        );

        const totalCount = allSections.length;
        const completedCount = completedSections.length;
        const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

        // Update progress bar
        const progressFill = progressSummary.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = `${overallProgress}%`;
        }

        // Update text
        const completedCountEl = progressSummary.querySelector('.completed-count');
        const totalCountEl = progressSummary.querySelector('.total-count');

        if (completedCountEl) completedCountEl.textContent = completedCount;
        if (totalCountEl) totalCountEl.textContent = totalCount;
    }

    /**
     * Get all sections from structure
     * @param {Object} structure - Content structure
     * @param {Array} sections - Sections array
     * @returns {Array} All sections
     */
    getAllSections(structure, sections = []) {
        if (structure && structure.sections) {
            structure.sections.forEach(section => {
                sections.push(section);
                if (section.sections) {
                    this.getAllSections(section, sections);
                }
            });
        }
        return sections;
    }

    /**
     * Get section progress
     * @param {string} sectionId - Section ID
     * @returns {number} Progress percentage
     */
    getSectionProgress(sectionId) {
        return this.progressData.get(sectionId) || 0;
    }

    /**
     * Generate section number
     * @param {number} level - Section level
     * @param {number} index - Section index
     * @returns {string} Section number
     */
    generateSectionNumber(level, index) {
        // Simple numbering: 1, 2, 3... for top level, 1.1, 1.2... for second level
        return index.toString();
    }

    /**
     * Calculate estimated time
     * @param {Object} section - Section data
     * @returns {number} Estimated time in minutes
     */
    calculateEstimatedTime(section) {
        // Rough estimation based on content length
        const wordCount = section.content ? section.content.split(/\s+/).length : 100;
        const readingSpeed = 200; // words per minute
        return Math.ceil(wordCount / readingSpeed);
    }

    /**
     * Format estimated time
     * @param {number} minutes - Time in minutes
     * @returns {string} Formatted time
     */
    formatEstimatedTime(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}h ${remainingMinutes}m`;
        }
    }

    /**
     * Toggle bookmark
     * @param {string} tocId - TOC ID
     * @param {string} sectionId - Section ID
     */
    toggleBookmark(tocId, sectionId) {
        // This would interact with a bookmark service
        // For now, just emit an event
        this.emitEvent('tocBookmarkToggle', { tocId, sectionId });
    }

    /**
     * Extract structure from existing element
     * @param {HTMLElement} element - Element to extract from
     * @returns {Object} Content structure
     */
    extractStructureFromElement(element) {
        // Try to find existing headings or list items
        const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length > 0) {
            return this.buildStructureFromHeadings(headings);
        }

        // Fallback: create basic structure
        return {
            sections: [
                { id: 'introduction', title: 'Introduction', sections: [] },
                { id: 'content', title: 'Content', sections: [] },
                { id: 'conclusion', title: 'Conclusion', sections: [] }
            ]
        };
    }

    /**
     * Load progress data
     */
    loadProgressData() {
        // Load from localStorage or service
        try {
            const saved = localStorage.getItem('toc_progress');
            if (saved) {
                const data = JSON.parse(saved);
                Object.entries(data).forEach(([sectionId, progress]) => {
                    this.progressData.set(sectionId, progress);
                });
            }
        } catch (error) {
            console.error('Failed to load progress data:', error);
        }
    }

    /**
     * Save progress data
     */
    saveProgressData() {
        try {
            const data = Object.fromEntries(this.progressData);
            localStorage.setItem('toc_progress', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save progress data:', error);
        }
    }

    /**
     * Generate unique TOC ID
     * @returns {string} TOC ID
     */
    generateTOCId() {
        return 'toc_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get TOC data
     * @param {string} tocId - TOC ID
     * @returns {Object} TOC data
     */
    getTOCData(tocId) {
        return this.tocInstances.get(tocId);
    }

    /**
     * Remove TOC
     * @param {string} tocId - TOC ID
     */
    removeTOC(tocId) {
        this.tocInstances.delete(tocId);
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    emitEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...detail, component: 'TableOfContents' }
        });
        document.dispatchEvent(event);
    }

    /**
     * Destroy the table of contents component
     */
    destroy() {
        console.log('Destroying table of contents component');

        // Save progress data
        this.saveProgressData();

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up TOC event listener:', error);
            }
        });
        this.eventListeners = [];

        // Clear TOC instances
        this.tocInstances.clear();
        this.progressData.clear();

        // Reset state
        this.isInitialized = false;

        console.log('Table of contents component destroyed');
    }
}

// Create and export singleton instance
export const tableOfContents = new TableOfContents();

// Convenience functions
export function createTableOfContents(container, structure = null, options = {}) {
    return tableOfContents.create(container, structure, options);
}

export function updateTOCProgress(sectionId, progress) {
    tableOfContents.updateSectionProgress(sectionId, progress);
}

export default tableOfContents;