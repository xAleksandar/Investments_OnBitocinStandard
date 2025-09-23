/**
 * Suggestion List Component
 * Admin interface for managing user suggestions with moderation tools
 * Extracted from monolithic BitcoinGame class as part of Task 6.5
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';
import { formatDate, formatNumber } from '../../utils/formatters.js';

export class SuggestionList {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Suggestion list instances
        this.suggestionLists = new Map();

        // Component configuration
        this.defaultOptions = {
            enableFiltering: true,
            enableSorting: true,
            enableBulkActions: true,
            enableSearch: true,
            showUserInfo: true,
            showTimestamps: true,
            showPriority: true,
            itemsPerPage: 20,
            enablePagination: true,
            autoRefresh: true,
            refreshInterval: 30000 // 30 seconds
        };

        // Filter options
        this.filterOptions = {
            status: ['all', 'pending', 'approved', 'rejected', 'implemented'],
            priority: ['all', 'low', 'medium', 'high', 'critical'],
            category: ['all', 'feature', 'bug', 'improvement', 'content', 'other'],
            source: ['all', 'app', 'email', 'form', 'api']
        };

        // Sort options
        this.sortOptions = {
            date: 'Date Submitted',
            priority: 'Priority',
            status: 'Status',
            category: 'Category',
            user: 'User',
            votes: 'Votes'
        };

        // Bulk actions
        this.bulkActions = {
            approve: 'Approve Selected',
            reject: 'Reject Selected',
            setPriority: 'Set Priority',
            archive: 'Archive Selected',
            delete: 'Delete Selected'
        };

        // Auto-refresh timer
        this.refreshTimer = null;
    }

    /**
     * Initialize the suggestion list component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('SuggestionList already initialized');
            return;
        }

        try {
            // Check for admin permissions
            if (!this.services.authService?.isCurrentUserAdmin()) {
                console.error('SuggestionList requires admin permissions');
                return;
            }

            // Merge options
            this.defaultOptions = { ...this.defaultOptions, ...options };

            // Enhance existing suggestion lists
            this.enhanceExistingSuggestionLists();

            // Set up global event listeners
            this.setupGlobalEventListeners();

            // Start auto-refresh if enabled
            if (this.defaultOptions.autoRefresh) {
                this.startAutoRefresh();
            }

            this.isInitialized = true;
            console.log('SuggestionList initialized successfully');

        } catch (error) {
            console.error('Failed to initialize suggestion list:', error);
        }
    }

    /**
     * Enhance existing suggestion list elements in the DOM
     */
    enhanceExistingSuggestionLists() {
        const existingLists = document.querySelectorAll('[data-suggestion-list], .suggestion-list');
        existingLists.forEach(list => {
            if (!list.dataset.suggestionListEnhanced) {
                this.enhanceSuggestionList(list);
            }
        });
    }

    /**
     * Set up global event listeners
     */
    setupGlobalEventListeners() {
        // Listen for suggestion updates
        document.addEventListener('suggestionUpdated', (e) => {
            if (e.detail && e.detail.suggestionId) {
                this.refreshSuggestionDisplay(e.detail.suggestionId);
            }
        });

        // Listen for new suggestions
        document.addEventListener('newSuggestion', () => {
            this.refreshAllLists();
        });
    }

    /**
     * Create a new suggestion list
     * @param {HTMLElement} container - Container element
     * @param {Object} options - List options
     * @returns {string} List ID
     */
    create(container, options = {}) {
        if (!container) {
            console.error('Container element is required for suggestion list');
            return null;
        }

        const listOptions = { ...this.defaultOptions, ...options };
        const listId = this.generateListId();

        // Set up container
        this.setupListContainer(container, listOptions);

        // Create list structure
        this.createListStructure(container, listId);

        // Set up event listeners
        this.setupListEventListeners(container, listId);

        // Store list instance
        this.suggestionLists.set(listId, {
            container: container,
            options: listOptions,
            suggestions: [],
            filteredSuggestions: [],
            selectedSuggestions: new Set(),
            currentFilter: { status: 'all', priority: 'all', category: 'all', source: 'all' },
            currentSort: 'date',
            sortOrder: 'desc',
            searchQuery: '',
            currentPage: 1
        });

        container.dataset.listId = listId;

        // Load suggestions
        this.loadSuggestions(listId);

        return listId;
    }

    /**
     * Enhance an existing suggestion list element
     * @param {HTMLElement} container - List container element
     * @param {Object} options - Enhancement options
     */
    enhanceSuggestionList(container, options = {}) {
        if (!container || container.dataset.suggestionListEnhanced) return;

        const listId = this.create(container, options);
        container.dataset.suggestionListEnhanced = 'true';

        return listId;
    }

    /**
     * Set up list container
     * @param {HTMLElement} container - Container element
     * @param {Object} options - List options
     */
    setupListContainer(container, options) {
        container.classList.add('suggestion-list-container', 'admin-component');

        if (options.enableBulkActions) {
            container.classList.add('with-bulk-actions');
        }
    }

    /**
     * Create list HTML structure
     * @param {HTMLElement} container - Container element
     * @param {string} listId - List ID
     */
    createListStructure(container, listId) {
        const structure = `
            <div class="suggestion-list-header">
                <div class="header-title">
                    <h3>User Suggestions</h3>
                    <div class="suggestions-count" id="suggestionsCount-${listId}">
                        <span class="count">0</span> suggestions
                    </div>
                </div>

                <div class="header-controls">
                    ${this.defaultOptions.enableSearch ? `
                        <div class="search-section">
                            <input type="text" class="search-input" placeholder="Search suggestions..." id="suggestionSearch-${listId}">
                            <button class="btn btn-sm clear-search" id="clearSearch-${listId}">✕</button>
                        </div>
                    ` : ''}

                    <button class="btn btn-primary refresh-btn" id="refreshSuggestions-${listId}">
                        🔄 Refresh
                    </button>

                    <button class="btn btn-secondary export-btn" id="exportSuggestions-${listId}">
                        📊 Export
                    </button>
                </div>
            </div>

            ${this.defaultOptions.enableFiltering ? `
                <div class="filters-section" id="filtersSection-${listId}">
                    <div class="filter-group">
                        <label>Status:</label>
                        <select class="filter-select" data-filter="status" id="statusFilter-${listId}">
                            ${this.renderFilterOptions('status')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>Priority:</label>
                        <select class="filter-select" data-filter="priority" id="priorityFilter-${listId}">
                            ${this.renderFilterOptions('priority')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>Category:</label>
                        <select class="filter-select" data-filter="category" id="categoryFilter-${listId}">
                            ${this.renderFilterOptions('category')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>Source:</label>
                        <select class="filter-select" data-filter="source" id="sourceFilter-${listId}">
                            ${this.renderFilterOptions('source')}
                        </select>
                    </div>

                    <button class="btn btn-sm clear-filters" id="clearFilters-${listId}">Clear All</button>
                </div>
            ` : ''}

            ${this.defaultOptions.enableSorting ? `
                <div class="sorting-section" id="sortingSection-${listId}">
                    <div class="sort-controls">
                        <label>Sort by:</label>
                        <select class="sort-select" id="sortBy-${listId}">
                            ${this.renderSortOptions()}
                        </select>
                        <button class="btn btn-sm sort-direction" id="sortDirection-${listId}" title="Sort Direction">↓</button>
                    </div>
                </div>
            ` : ''}

            ${this.defaultOptions.enableBulkActions ? `
                <div class="bulk-actions-section" id="bulkActionsSection-${listId}" style="display: none;">
                    <div class="bulk-controls">
                        <span class="selected-count" id="selectedCount-${listId}">0 selected</span>

                        <div class="bulk-action-buttons">
                            <button class="btn btn-sm btn-success bulk-action-btn"
                                    data-action="approve" id="bulkApprove-${listId}">
                                ✅ Approve
                            </button>
                            <button class="btn btn-sm btn-danger bulk-action-btn"
                                    data-action="reject" id="bulkReject-${listId}">
                                ❌ Reject
                            </button>
                            <button class="btn btn-sm btn-warning bulk-action-btn"
                                    data-action="setPriority" id="bulkSetPriority-${listId}">
                                🔥 Set Priority
                            </button>
                            <button class="btn btn-sm btn-secondary bulk-action-btn"
                                    data-action="archive" id="bulkArchive-${listId}">
                                📦 Archive
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div class="suggestion-list-content" id="suggestionListContent-${listId}">
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <span>Loading suggestions...</span>
                </div>
            </div>

            ${this.defaultOptions.enablePagination ? `
                <div class="pagination-section" id="paginationSection-${listId}" style="display: none;">
                    <div class="pagination-info">
                        <span class="page-info" id="pageInfo-${listId}">Page 1 of 1</span>
                    </div>
                    <div class="pagination-controls">
                        <button class="btn btn-sm page-btn" id="prevPage-${listId}" disabled>← Previous</button>
                        <div class="page-numbers" id="pageNumbers-${listId}"></div>
                        <button class="btn btn-sm page-btn" id="nextPage-${listId}" disabled>Next →</button>
                    </div>
                </div>
            ` : ''}
        `;

        container.innerHTML = structure;
    }

    /**
     * Render filter options
     * @param {string} filterType - Filter type
     * @returns {string} HTML for filter options
     */
    renderFilterOptions(filterType) {
        const options = this.filterOptions[filterType] || [];
        return options.map(option => {
            const label = option.charAt(0).toUpperCase() + option.slice(1);
            return `<option value="${option}">${label}</option>`;
        }).join('');
    }

    /**
     * Render sort options
     * @returns {string} HTML for sort options
     */
    renderSortOptions() {
        return Object.entries(this.sortOptions).map(([key, label]) => {
            return `<option value="${key}">${label}</option>`;
        }).join('');
    }

    /**
     * Set up list event listeners
     * @param {HTMLElement} container - Container element
     * @param {string} listId - List ID
     */
    setupListEventListeners(container, listId) {
        // Search functionality
        this.setupSearchHandlers(container, listId);

        // Filter controls
        this.setupFilterHandlers(container, listId);

        // Sort controls
        this.setupSortHandlers(container, listId);

        // Bulk action controls
        if (this.defaultOptions.enableBulkActions) {
            this.setupBulkActionHandlers(container, listId);
        }

        // Pagination controls
        if (this.defaultOptions.enablePagination) {
            this.setupPaginationHandlers(container, listId);
        }

        // Action buttons
        this.setupActionHandlers(container, listId);

        // Suggestion item interactions
        this.setupSuggestionInteractions(container, listId);
    }

    /**
     * Set up search handlers
     * @param {HTMLElement} container - Container element
     * @param {string} listId - List ID
     */
    setupSearchHandlers(container, listId) {
        const searchInput = container.querySelector(`#suggestionSearch-${listId}`);
        const clearSearch = container.querySelector(`#clearSearch-${listId}`);

        if (searchInput) {
            let searchTimeout;
            const searchHandler = () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performSearch(listId, searchInput.value);
                }, 300);
            };

            const cleanup1 = addEventListener(searchInput, 'input', searchHandler);
            this.eventListeners.push(cleanup1);
        }

        if (clearSearch) {
            const cleanup = addEventListener(clearSearch, 'click', () => {
                this.clearSearch(listId);
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up filter handlers
     * @param {HTMLElement} container - Container element
     * @param {string} listId - List ID
     */
    setupFilterHandlers(container, listId) {
        const filterSelects = container.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            const cleanup = addEventListener(select, 'change', () => {
                this.applyFilter(listId, select.dataset.filter, select.value);
            });
            this.eventListeners.push(cleanup);
        });

        const clearFilters = container.querySelector(`#clearFilters-${listId}`);
        if (clearFilters) {
            const cleanup = addEventListener(clearFilters, 'click', () => {
                this.clearAllFilters(listId);
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up sort handlers
     * @param {HTMLElement} container - Container element
     * @param {string} listId - List ID
     */
    setupSortHandlers(container, listId) {
        const sortSelect = container.querySelector(`#sortBy-${listId}`);
        const sortDirection = container.querySelector(`#sortDirection-${listId}`);

        if (sortSelect) {
            const cleanup = addEventListener(sortSelect, 'change', () => {
                this.applySorting(listId, sortSelect.value);
            });
            this.eventListeners.push(cleanup);
        }

        if (sortDirection) {
            const cleanup = addEventListener(sortDirection, 'click', () => {
                this.toggleSortDirection(listId);
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up bulk action handlers
     * @param {HTMLElement} container - Container element
     * @param {string} listId - List ID
     */
    setupBulkActionHandlers(container, listId) {
        const bulkActionBtns = container.querySelectorAll('.bulk-action-btn');
        bulkActionBtns.forEach(btn => {
            const cleanup = addEventListener(btn, 'click', () => {
                this.performBulkAction(listId, btn.dataset.action);
            });
            this.eventListeners.push(cleanup);
        });
    }

    /**
     * Set up pagination handlers
     * @param {HTMLElement} container - Container element
     * @param {string} listId - List ID
     */
    setupPaginationHandlers(container, listId) {
        const prevBtn = container.querySelector(`#prevPage-${listId}`);
        const nextBtn = container.querySelector(`#nextPage-${listId}`);

        if (prevBtn) {
            const cleanup = addEventListener(prevBtn, 'click', () => {
                this.goToPreviousPage(listId);
            });
            this.eventListeners.push(cleanup);
        }

        if (nextBtn) {
            const cleanup = addEventListener(nextBtn, 'click', () => {
                this.goToNextPage(listId);
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up action handlers
     * @param {HTMLElement} container - Container element
     * @param {string} listId - List ID
     */
    setupActionHandlers(container, listId) {
        const refreshBtn = container.querySelector(`#refreshSuggestions-${listId}`);
        const exportBtn = container.querySelector(`#exportSuggestions-${listId}`);

        if (refreshBtn) {
            const cleanup = addEventListener(refreshBtn, 'click', () => {
                this.refreshSuggestions(listId);
            });
            this.eventListeners.push(cleanup);
        }

        if (exportBtn) {
            const cleanup = addEventListener(exportBtn, 'click', () => {
                this.exportSuggestions(listId);
            });
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up suggestion item interactions
     * @param {HTMLElement} container - Container element
     * @param {string} listId - List ID
     */
    setupSuggestionInteractions(container, listId) {
        const listContent = container.querySelector(`#suggestionListContent-${listId}`);
        if (!listContent) return;

        const clickHandler = (e) => {
            this.handleSuggestionClick(e, listId);
        };

        const cleanup = addEventListener(listContent, 'click', clickHandler);
        this.eventListeners.push(cleanup);
    }

    /**
     * Load suggestions from API
     * @param {string} listId - List ID
     */
    async loadSuggestions(listId) {
        const listData = this.suggestionLists.get(listId);
        if (!listData) return;

        try {
            this.showLoadingState(listId);

            // Load suggestions from admin service
            const suggestions = await this.services.adminService?.getSuggestions() || this.getMockSuggestions();

            listData.suggestions = suggestions;
            this.applyFiltersAndSorting(listId);
            this.renderSuggestions(listId);

            this.hideLoadingState(listId);

        } catch (error) {
            console.error('Failed to load suggestions:', error);
            this.showErrorState(listId);
        }
    }

    /**
     * Get mock suggestions for demo
     * @returns {Array} Mock suggestions
     */
    getMockSuggestions() {
        return [
            {
                id: 'sugg_001',
                title: 'Add portfolio export feature',
                description: 'It would be great to export portfolio data to CSV or PDF for record keeping.',
                category: 'feature',
                priority: 'medium',
                status: 'pending',
                source: 'app',
                user: {
                    id: 'user_123',
                    username: 'cryptouser2023',
                    email: 'user@example.com'
                },
                votes: 15,
                createdAt: '2023-11-15T10:30:00Z',
                updatedAt: '2023-11-15T10:30:00Z',
                tags: ['export', 'portfolio', 'data']
            },
            {
                id: 'sugg_002',
                title: 'Dark mode toggle',
                description: 'Please add a dark mode option for better viewing in low light conditions.',
                category: 'improvement',
                priority: 'low',
                status: 'approved',
                source: 'form',
                user: {
                    id: 'user_456',
                    username: 'nightowl',
                    email: 'owl@example.com'
                },
                votes: 28,
                createdAt: '2023-11-10T14:22:00Z',
                updatedAt: '2023-11-12T09:15:00Z',
                tags: ['ui', 'dark-mode', 'accessibility']
            },
            {
                id: 'sugg_003',
                title: 'Price alerts not working',
                description: 'The price alert notifications stopped working after the last update.',
                category: 'bug',
                priority: 'high',
                status: 'implemented',
                source: 'email',
                user: {
                    id: 'user_789',
                    username: 'trader_pro',
                    email: 'trader@example.com'
                },
                votes: 42,
                createdAt: '2023-11-08T16:45:00Z',
                updatedAt: '2023-11-14T11:30:00Z',
                tags: ['alerts', 'notifications', 'bug']
            },
            {
                id: 'sugg_004',
                title: 'Advanced charting tools',
                description: 'Add technical indicators like RSI, MACD, and Bollinger Bands to the charts.',
                category: 'feature',
                priority: 'low',
                status: 'rejected',
                source: 'api',
                user: {
                    id: 'user_101',
                    username: 'chart_master',
                    email: 'charts@example.com'
                },
                votes: 8,
                createdAt: '2023-11-05T12:00:00Z',
                updatedAt: '2023-11-13T15:20:00Z',
                tags: ['charts', 'technical-analysis', 'indicators']
            },
            {
                id: 'sugg_005',
                title: 'Mobile app development',
                description: 'Create a mobile app for iOS and Android to complement the web application.',
                category: 'feature',
                priority: 'critical',
                status: 'pending',
                source: 'form',
                user: {
                    id: 'user_202',
                    username: 'mobile_fan',
                    email: 'mobile@example.com'
                },
                votes: 67,
                createdAt: '2023-11-01T08:15:00Z',
                updatedAt: '2023-11-01T08:15:00Z',
                tags: ['mobile', 'app', 'ios', 'android']
            }
        ];
    }

    /**
     * Apply filters and sorting
     * @param {string} listId - List ID
     */
    applyFiltersAndSorting(listId) {
        const listData = this.suggestionLists.get(listId);
        if (!listData) return;

        let filteredSuggestions = [...listData.suggestions];

        // Apply search filter
        if (listData.searchQuery) {
            filteredSuggestions = this.filterBySearch(filteredSuggestions, listData.searchQuery);
        }

        // Apply category filters
        Object.entries(listData.currentFilter).forEach(([filterType, filterValue]) => {
            if (filterValue !== 'all') {
                filteredSuggestions = this.filterByType(filteredSuggestions, filterType, filterValue);
            }
        });

        // Apply sorting
        filteredSuggestions = this.sortSuggestions(filteredSuggestions, listData.currentSort, listData.sortOrder);

        listData.filteredSuggestions = filteredSuggestions;
        listData.currentPage = 1; // Reset to first page
    }

    /**
     * Filter suggestions by search query
     * @param {Array} suggestions - Suggestions array
     * @param {string} query - Search query
     * @returns {Array} Filtered suggestions
     */
    filterBySearch(suggestions, query) {
        const lowerQuery = query.toLowerCase();
        return suggestions.filter(suggestion => {
            return suggestion.title.toLowerCase().includes(lowerQuery) ||
                   suggestion.description.toLowerCase().includes(lowerQuery) ||
                   suggestion.user.username.toLowerCase().includes(lowerQuery) ||
                   suggestion.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
        });
    }

    /**
     * Filter suggestions by type
     * @param {Array} suggestions - Suggestions array
     * @param {string} filterType - Filter type
     * @param {string} filterValue - Filter value
     * @returns {Array} Filtered suggestions
     */
    filterByType(suggestions, filterType, filterValue) {
        return suggestions.filter(suggestion => suggestion[filterType] === filterValue);
    }

    /**
     * Sort suggestions
     * @param {Array} suggestions - Suggestions array
     * @param {string} sortBy - Sort field
     * @param {string} sortOrder - Sort order
     * @returns {Array} Sorted suggestions
     */
    sortSuggestions(suggestions, sortBy, sortOrder) {
        return [...suggestions].sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'date':
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
                    break;
                case 'priority':
                    const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
                    aValue = priorityOrder[a.priority] || 0;
                    bValue = priorityOrder[b.priority] || 0;
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                case 'category':
                    aValue = a.category;
                    bValue = b.category;
                    break;
                case 'user':
                    aValue = a.user.username.toLowerCase();
                    bValue = b.user.username.toLowerCase();
                    break;
                case 'votes':
                    aValue = a.votes || 0;
                    bValue = b.votes || 0;
                    break;
                default:
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
            }

            if (typeof aValue === 'string') {
                return sortOrder === 'asc' ?
                    aValue.localeCompare(bValue) :
                    bValue.localeCompare(aValue);
            } else {
                return sortOrder === 'asc' ?
                    aValue - bValue :
                    bValue - aValue;
            }
        });
    }

    /**
     * Render suggestions
     * @param {string} listId - List ID
     */
    renderSuggestions(listId) {
        const listData = this.suggestionLists.get(listId);
        const listContent = getElementById(`suggestionListContent-${listId}`);

        if (!listData || !listContent) return;

        const { filteredSuggestions, currentPage, options } = listData;

        // Calculate pagination
        const startIndex = (currentPage - 1) * options.itemsPerPage;
        const endIndex = startIndex + options.itemsPerPage;
        const pageSuggestions = options.enablePagination ?
            filteredSuggestions.slice(startIndex, endIndex) :
            filteredSuggestions;

        if (pageSuggestions.length === 0) {
            listContent.innerHTML = this.renderEmptyState(listData);
        } else {
            let suggestionsHtml = '<div class="suggestions-table">';
            suggestionsHtml += this.renderTableHeader(listId);
            suggestionsHtml += '<div class="suggestions-body">';

            pageSuggestions.forEach(suggestion => {
                suggestionsHtml += this.renderSuggestionRow(suggestion, listData);
            });

            suggestionsHtml += '</div></div>';
            listContent.innerHTML = suggestionsHtml;
        }

        // Update count and pagination
        this.updateSuggestionsCount(listId, filteredSuggestions.length);
        if (options.enablePagination) {
            this.updatePagination(listId, filteredSuggestions.length);
        }
    }

    /**
     * Render table header
     * @param {string} listId - List ID
     * @returns {string} HTML for table header
     */
    renderTableHeader(listId) {
        return `
            <div class="suggestions-header">
                ${this.defaultOptions.enableBulkActions ? `
                    <div class="header-cell checkbox-cell">
                        <input type="checkbox" id="selectAll-${listId}" class="select-all-checkbox">
                    </div>
                ` : ''}
                <div class="header-cell title-cell">Title</div>
                <div class="header-cell category-cell">Category</div>
                <div class="header-cell priority-cell">Priority</div>
                <div class="header-cell status-cell">Status</div>
                <div class="header-cell user-cell">User</div>
                <div class="header-cell votes-cell">Votes</div>
                <div class="header-cell date-cell">Date</div>
                <div class="header-cell actions-cell">Actions</div>
            </div>
        `;
    }

    /**
     * Render suggestion row
     * @param {Object} suggestion - Suggestion data
     * @param {Object} listData - List data
     * @returns {string} HTML for suggestion row
     */
    renderSuggestionRow(suggestion, listData) {
        const isSelected = listData.selectedSuggestions.has(suggestion.id);
        const statusClass = `status-${suggestion.status}`;
        const priorityClass = `priority-${suggestion.priority}`;

        return `
            <div class="suggestion-row ${statusClass}" data-suggestion-id="${suggestion.id}">
                ${this.defaultOptions.enableBulkActions ? `
                    <div class="row-cell checkbox-cell">
                        <input type="checkbox" class="suggestion-checkbox"
                               value="${suggestion.id}" ${isSelected ? 'checked' : ''}>
                    </div>
                ` : ''}

                <div class="row-cell title-cell">
                    <div class="suggestion-title">${suggestion.title}</div>
                    <div class="suggestion-description">${this.truncateText(suggestion.description, 100)}</div>
                    <div class="suggestion-tags">
                        ${suggestion.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>

                <div class="row-cell category-cell">
                    <span class="category-badge category-${suggestion.category}">
                        ${suggestion.category}
                    </span>
                </div>

                <div class="row-cell priority-cell">
                    <span class="priority-badge ${priorityClass}">
                        ${this.getPriorityIcon(suggestion.priority)} ${suggestion.priority}
                    </span>
                </div>

                <div class="row-cell status-cell">
                    <span class="status-badge ${statusClass}">
                        ${this.getStatusIcon(suggestion.status)} ${suggestion.status}
                    </span>
                </div>

                ${this.defaultOptions.showUserInfo ? `
                    <div class="row-cell user-cell">
                        <div class="user-info">
                            <div class="username">${suggestion.user.username}</div>
                            <div class="user-email">${suggestion.user.email}</div>
                        </div>
                    </div>
                ` : ''}

                <div class="row-cell votes-cell">
                    <span class="votes-count">👍 ${suggestion.votes}</span>
                </div>

                ${this.defaultOptions.showTimestamps ? `
                    <div class="row-cell date-cell">
                        <div class="created-date">${formatDate(new Date(suggestion.createdAt))}</div>
                        ${suggestion.updatedAt !== suggestion.createdAt ? `
                            <div class="updated-date">Updated: ${formatDate(new Date(suggestion.updatedAt))}</div>
                        ` : ''}
                    </div>
                ` : ''}

                <div class="row-cell actions-cell">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary view-btn"
                                data-action="view" data-suggestion-id="${suggestion.id}" title="View Details">
                            👁️
                        </button>

                        ${suggestion.status === 'pending' ? `
                            <button class="btn btn-sm btn-success approve-btn"
                                    data-action="approve" data-suggestion-id="${suggestion.id}" title="Approve">
                                ✅
                            </button>
                            <button class="btn btn-sm btn-danger reject-btn"
                                    data-action="reject" data-suggestion-id="${suggestion.id}" title="Reject">
                                ❌
                            </button>
                        ` : ''}

                        <button class="btn btn-sm btn-secondary priority-btn"
                                data-action="priority" data-suggestion-id="${suggestion.id}" title="Change Priority">
                            🔥
                        </button>

                        <button class="btn btn-sm btn-warning more-btn"
                                data-action="more" data-suggestion-id="${suggestion.id}" title="More Actions">
                            ⋯
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render empty state
     * @param {Object} listData - List data
     * @returns {string} HTML for empty state
     */
    renderEmptyState(listData) {
        const hasFilters = Object.values(listData.currentFilter).some(value => value !== 'all') ||
                          listData.searchQuery.length > 0;

        return `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>${hasFilters ? 'No suggestions match your filters' : 'No suggestions yet'}</h3>
                <p>
                    ${hasFilters ?
                        'Try adjusting your filters to see more suggestions.' :
                        'User suggestions will appear here when they are submitted.'
                    }
                </p>
                ${hasFilters ? `
                    <button class="btn btn-primary clear-filters-btn">Clear Filters</button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Handle suggestion click events
     * @param {Event} e - Click event
     * @param {string} listId - List ID
     */
    handleSuggestionClick(e, listId) {
        const action = e.target.closest('[data-action]')?.dataset.action;
        const suggestionId = e.target.closest('[data-suggestion-id]')?.dataset.suggestionId;

        if (action && suggestionId) {
            e.preventDefault();
            this.handleSuggestionAction(listId, action, suggestionId);
            return;
        }

        // Handle checkbox selection
        if (e.target.classList.contains('suggestion-checkbox')) {
            this.handleSuggestionSelection(listId, e.target);
            return;
        }

        // Handle select all checkbox
        if (e.target.classList.contains('select-all-checkbox')) {
            this.handleSelectAll(listId, e.target.checked);
            return;
        }
    }

    /**
     * Handle suggestion action
     * @param {string} listId - List ID
     * @param {string} action - Action type
     * @param {string} suggestionId - Suggestion ID
     */
    async handleSuggestionAction(listId, action, suggestionId) {
        try {
            switch (action) {
                case 'view':
                    this.viewSuggestionDetails(suggestionId);
                    break;
                case 'approve':
                    await this.approveSuggestion(suggestionId);
                    break;
                case 'reject':
                    await this.rejectSuggestion(suggestionId);
                    break;
                case 'priority':
                    this.changeSuggestionPriority(suggestionId);
                    break;
                case 'more':
                    this.showMoreActions(suggestionId);
                    break;
            }

            // Refresh the display
            this.refreshSuggestionDisplay(suggestionId);

        } catch (error) {
            console.error('Failed to perform suggestion action:', error);
            this.services.notificationService?.showError(`Failed to ${action} suggestion`);
        }
    }

    /**
     * View suggestion details
     * @param {string} suggestionId - Suggestion ID
     */
    viewSuggestionDetails(suggestionId) {
        // This would open a modal or navigate to a detail page
        this.emitEvent('viewSuggestionDetails', { suggestionId });
    }

    /**
     * Approve suggestion
     * @param {string} suggestionId - Suggestion ID
     */
    async approveSuggestion(suggestionId) {
        await this.updateSuggestionStatus(suggestionId, 'approved');
        this.services.notificationService?.showSuccess('Suggestion approved');
    }

    /**
     * Reject suggestion
     * @param {string} suggestionId - Suggestion ID
     */
    async rejectSuggestion(suggestionId) {
        await this.updateSuggestionStatus(suggestionId, 'rejected');
        this.services.notificationService?.showSuccess('Suggestion rejected');
    }

    /**
     * Update suggestion status
     * @param {string} suggestionId - Suggestion ID
     * @param {string} status - New status
     */
    async updateSuggestionStatus(suggestionId, status) {
        // Update via admin service
        await this.services.adminService?.updateSuggestionStatus(suggestionId, status);

        // Update local data
        for (const listData of this.suggestionLists.values()) {
            const suggestion = listData.suggestions.find(s => s.id === suggestionId);
            if (suggestion) {
                suggestion.status = status;
                suggestion.updatedAt = new Date().toISOString();
            }
        }
    }

    /**
     * Change suggestion priority
     * @param {string} suggestionId - Suggestion ID
     */
    changeSuggestionPriority(suggestionId) {
        // This would show a priority selection modal
        this.emitEvent('changeSuggestionPriority', { suggestionId });
    }

    /**
     * Show more actions
     * @param {string} suggestionId - Suggestion ID
     */
    showMoreActions(suggestionId) {
        // This would show a context menu with additional actions
        this.emitEvent('showSuggestionActions', { suggestionId });
    }

    /**
     * Handle suggestion selection
     * @param {string} listId - List ID
     * @param {HTMLElement} checkbox - Checkbox element
     */
    handleSuggestionSelection(listId, checkbox) {
        const listData = this.suggestionLists.get(listId);
        if (!listData) return;

        const suggestionId = checkbox.value;

        if (checkbox.checked) {
            listData.selectedSuggestions.add(suggestionId);
        } else {
            listData.selectedSuggestions.delete(suggestionId);
        }

        this.updateBulkActionsUI(listId);
    }

    /**
     * Handle select all
     * @param {string} listId - List ID
     * @param {boolean} selectAll - Select all flag
     */
    handleSelectAll(listId, selectAll) {
        const listData = this.suggestionLists.get(listId);
        if (!listData) return;

        const checkboxes = listData.container.querySelectorAll('.suggestion-checkbox');

        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            const suggestionId = checkbox.value;

            if (selectAll) {
                listData.selectedSuggestions.add(suggestionId);
            } else {
                listData.selectedSuggestions.delete(suggestionId);
            }
        });

        this.updateBulkActionsUI(listId);
    }

    /**
     * Update bulk actions UI
     * @param {string} listId - List ID
     */
    updateBulkActionsUI(listId) {
        const listData = this.suggestionLists.get(listId);
        const bulkActionsSection = getElementById(`bulkActionsSection-${listId}`);
        const selectedCount = getElementById(`selectedCount-${listId}`);

        if (!listData || !bulkActionsSection) return;

        const selectedSize = listData.selectedSuggestions.size;

        if (selectedSize > 0) {
            showElement(bulkActionsSection);
            if (selectedCount) {
                selectedCount.textContent = `${selectedSize} selected`;
            }
        } else {
            hideElement(bulkActionsSection);
        }
    }

    /**
     * Perform bulk action
     * @param {string} listId - List ID
     * @param {string} action - Bulk action
     */
    async performBulkAction(listId, action) {
        const listData = this.suggestionLists.get(listId);
        if (!listData || listData.selectedSuggestions.size === 0) return;

        const selectedIds = Array.from(listData.selectedSuggestions);

        if (!confirm(`Are you sure you want to ${action} ${selectedIds.length} suggestion(s)?`)) {
            return;
        }

        try {
            switch (action) {
                case 'approve':
                    await this.bulkUpdateStatus(selectedIds, 'approved');
                    break;
                case 'reject':
                    await this.bulkUpdateStatus(selectedIds, 'rejected');
                    break;
                case 'archive':
                    await this.bulkArchiveSuggestions(selectedIds);
                    break;
                case 'setPriority':
                    this.showBulkPriorityModal(listId, selectedIds);
                    return; // Don't clear selection yet
            }

            // Clear selection and refresh
            listData.selectedSuggestions.clear();
            this.updateBulkActionsUI(listId);
            this.applyFiltersAndSorting(listId);
            this.renderSuggestions(listId);

            this.services.notificationService?.showSuccess(`Bulk ${action} completed`);

        } catch (error) {
            console.error('Failed to perform bulk action:', error);
            this.services.notificationService?.showError(`Failed to ${action} suggestions`);
        }
    }

    /**
     * Bulk update status
     * @param {Array} suggestionIds - Suggestion IDs
     * @param {string} status - New status
     */
    async bulkUpdateStatus(suggestionIds, status) {
        for (const suggestionId of suggestionIds) {
            await this.updateSuggestionStatus(suggestionId, status);
        }
    }

    /**
     * Bulk archive suggestions
     * @param {Array} suggestionIds - Suggestion IDs
     */
    async bulkArchiveSuggestions(suggestionIds) {
        // Archive suggestions via admin service
        await this.services.adminService?.archiveSuggestions(suggestionIds);
    }

    /**
     * Show bulk priority modal
     * @param {string} listId - List ID
     * @param {Array} suggestionIds - Suggestion IDs
     */
    showBulkPriorityModal(listId, suggestionIds) {
        this.emitEvent('showBulkPriorityModal', { listId, suggestionIds });
    }

    /**
     * Perform search
     * @param {string} listId - List ID
     * @param {string} query - Search query
     */
    performSearch(listId, query) {
        const listData = this.suggestionLists.get(listId);
        if (!listData) return;

        listData.searchQuery = query;
        this.applyFiltersAndSorting(listId);
        this.renderSuggestions(listId);
    }

    /**
     * Clear search
     * @param {string} listId - List ID
     */
    clearSearch(listId) {
        const searchInput = getElementById(`suggestionSearch-${listId}`);
        if (searchInput) {
            searchInput.value = '';
        }

        this.performSearch(listId, '');
    }

    /**
     * Apply filter
     * @param {string} listId - List ID
     * @param {string} filterType - Filter type
     * @param {string} filterValue - Filter value
     */
    applyFilter(listId, filterType, filterValue) {
        const listData = this.suggestionLists.get(listId);
        if (!listData) return;

        listData.currentFilter[filterType] = filterValue;
        this.applyFiltersAndSorting(listId);
        this.renderSuggestions(listId);
    }

    /**
     * Clear all filters
     * @param {string} listId - List ID
     */
    clearAllFilters(listId) {
        const listData = this.suggestionLists.get(listId);
        if (!listData) return;

        // Reset all filters
        Object.keys(listData.currentFilter).forEach(key => {
            listData.currentFilter[key] = 'all';
        });

        listData.searchQuery = '';

        // Update UI
        const filterSelects = listData.container.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.value = 'all';
        });

        const searchInput = getElementById(`suggestionSearch-${listId}`);
        if (searchInput) {
            searchInput.value = '';
        }

        this.applyFiltersAndSorting(listId);
        this.renderSuggestions(listId);
    }

    /**
     * Apply sorting
     * @param {string} listId - List ID
     * @param {string} sortBy - Sort field
     */
    applySorting(listId, sortBy) {
        const listData = this.suggestionLists.get(listId);
        if (!listData) return;

        listData.currentSort = sortBy;
        this.applyFiltersAndSorting(listId);
        this.renderSuggestions(listId);
    }

    /**
     * Toggle sort direction
     * @param {string} listId - List ID
     */
    toggleSortDirection(listId) {
        const listData = this.suggestionLists.get(listId);
        if (!listData) return;

        listData.sortOrder = listData.sortOrder === 'asc' ? 'desc' : 'asc';

        const sortDirection = getElementById(`sortDirection-${listId}`);
        if (sortDirection) {
            sortDirection.textContent = listData.sortOrder === 'asc' ? '↑' : '↓';
        }

        this.applyFiltersAndSorting(listId);
        this.renderSuggestions(listId);
    }

    /**
     * Go to previous page
     * @param {string} listId - List ID
     */
    goToPreviousPage(listId) {
        const listData = this.suggestionLists.get(listId);
        if (!listData || listData.currentPage <= 1) return;

        listData.currentPage--;
        this.renderSuggestions(listId);
    }

    /**
     * Go to next page
     * @param {string} listId - List ID
     */
    goToNextPage(listId) {
        const listData = this.suggestionLists.get(listId);
        if (!listData) return;

        const totalPages = Math.ceil(listData.filteredSuggestions.length / listData.options.itemsPerPage);
        if (listData.currentPage >= totalPages) return;

        listData.currentPage++;
        this.renderSuggestions(listId);
    }

    /**
     * Update suggestions count
     * @param {string} listId - List ID
     * @param {number} count - Suggestions count
     */
    updateSuggestionsCount(listId, count) {
        const suggestionsCount = getElementById(`suggestionsCount-${listId}`);
        if (suggestionsCount) {
            const countSpan = suggestionsCount.querySelector('.count');
            if (countSpan) {
                countSpan.textContent = count;
            }
        }
    }

    /**
     * Update pagination
     * @param {string} listId - List ID
     * @param {number} totalItems - Total items
     */
    updatePagination(listId, totalItems) {
        const listData = this.suggestionLists.get(listId);
        const paginationSection = getElementById(`paginationSection-${listId}`);

        if (!listData || !paginationSection) return;

        const { currentPage, options } = listData;
        const totalPages = Math.ceil(totalItems / options.itemsPerPage);

        if (totalPages <= 1) {
            hideElement(paginationSection);
            return;
        }

        showElement(paginationSection);

        const pageInfo = getElementById(`pageInfo-${listId}`);
        if (pageInfo) {
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        }

        const prevBtn = getElementById(`prevPage-${listId}`);
        const nextBtn = getElementById(`nextPage-${listId}`);

        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    }

    /**
     * Refresh suggestions
     * @param {string} listId - List ID
     */
    async refreshSuggestions(listId) {
        await this.loadSuggestions(listId);
        this.services.notificationService?.showSuccess('Suggestions refreshed');
    }

    /**
     * Export suggestions
     * @param {string} listId - List ID
     */
    exportSuggestions(listId) {
        const listData = this.suggestionLists.get(listId);
        if (!listData) return;

        // Create CSV content
        const suggestions = listData.filteredSuggestions;
        const csvContent = this.generateCSV(suggestions);

        // Download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `suggestions_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.services.notificationService?.showSuccess('Suggestions exported to CSV');
    }

    /**
     * Generate CSV content
     * @param {Array} suggestions - Suggestions array
     * @returns {string} CSV content
     */
    generateCSV(suggestions) {
        const headers = ['ID', 'Title', 'Description', 'Category', 'Priority', 'Status', 'User', 'Votes', 'Created', 'Updated'];
        const rows = suggestions.map(suggestion => [
            suggestion.id,
            `"${suggestion.title.replace(/"/g, '""')}"`,
            `"${suggestion.description.replace(/"/g, '""')}"`,
            suggestion.category,
            suggestion.priority,
            suggestion.status,
            suggestion.user.username,
            suggestion.votes,
            suggestion.createdAt,
            suggestion.updatedAt
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    /**
     * Refresh suggestion display
     * @param {string} suggestionId - Suggestion ID
     */
    refreshSuggestionDisplay(suggestionId) {
        for (const listId of this.suggestionLists.keys()) {
            this.applyFiltersAndSorting(listId);
            this.renderSuggestions(listId);
        }
    }

    /**
     * Refresh all lists
     */
    refreshAllLists() {
        for (const listId of this.suggestionLists.keys()) {
            this.loadSuggestions(listId);
        }
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            this.refreshAllLists();
        }, this.defaultOptions.refreshInterval);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Get priority icon
     * @param {string} priority - Priority level
     * @returns {string} Priority icon
     */
    getPriorityIcon(priority) {
        const icons = {
            low: '🟢',
            medium: '🟡',
            high: '🟠',
            critical: '🔴'
        };
        return icons[priority] || '⚪';
    }

    /**
     * Get status icon
     * @param {string} status - Status
     * @returns {string} Status icon
     */
    getStatusIcon(status) {
        const icons = {
            pending: '⏳',
            approved: '✅',
            rejected: '❌',
            implemented: '🚀'
        };
        return icons[status] || '❓';
    }

    /**
     * Truncate text
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Show loading state
     * @param {string} listId - List ID
     */
    showLoadingState(listId) {
        const listContent = getElementById(`suggestionListContent-${listId}`);
        if (listContent) {
            listContent.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <span>Loading suggestions...</span>
                </div>
            `;
        }
    }

    /**
     * Hide loading state
     * @param {string} listId - List ID
     */
    hideLoadingState(listId) {
        // Loading state will be replaced by content
    }

    /**
     * Show error state
     * @param {string} listId - List ID
     */
    showErrorState(listId) {
        const listContent = getElementById(`suggestionListContent-${listId}`);
        if (listContent) {
            listContent.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Failed to Load Suggestions</h3>
                    <p>Unable to load suggestions. Please try again.</p>
                    <button class="btn btn-primary retry-load" data-list-id="${listId}">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Generate unique list ID
     * @returns {string} List ID
     */
    generateListId() {
        return 'suggestion_list_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get list data
     * @param {string} listId - List ID
     * @returns {Object} List data
     */
    getListData(listId) {
        return this.suggestionLists.get(listId);
    }

    /**
     * Remove suggestion list
     * @param {string} listId - List ID
     */
    removeSuggestionList(listId) {
        this.suggestionLists.delete(listId);
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    emitEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...detail, component: 'SuggestionList' }
        });
        document.dispatchEvent(event);
    }

    /**
     * Destroy the suggestion list component
     */
    destroy() {
        console.log('Destroying suggestion list component');

        // Stop auto-refresh
        this.stopAutoRefresh();

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up suggestion list event listener:', error);
            }
        });
        this.eventListeners = [];

        // Clear list instances
        this.suggestionLists.clear();

        // Reset state
        this.isInitialized = false;

        console.log('Suggestion list component destroyed');
    }
}

// Create and export singleton instance
export const suggestionList = new SuggestionList();

// Convenience functions
export function createSuggestionList(container, options = {}) {
    return suggestionList.create(container, options);
}

export function refreshSuggestions(listId) {
    suggestionList.refreshSuggestions(listId);
}

export default suggestionList;