/**
 * Topic List Component
 * Educational topic browsing and organization with filtering, search, and progress tracking
 * Extracted from monolithic BitcoinGame class as part of Task 6.4
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';
import { formatDate, formatNumber } from '../../utils/formatters.js';

export class TopicList {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Topic list instances
        this.topicLists = new Map();

        // Topic list configuration
        this.defaultOptions = {
            enableSearch: true,
            enableFiltering: true,
            enableSorting: true,
            enableProgress: true,
            enableBookmarks: true,
            showDifficulty: true,
            showEstimatedTime: true,
            showPrerequisites: true,
            viewMode: 'grid', // 'grid', 'list', 'compact'
            itemsPerPage: 20,
            enablePagination: true,
            autoLoad: true
        };

        // Filter and sort options
        this.filterOptions = {
            difficulty: ['all', 'beginner', 'intermediate', 'advanced'],
            category: ['all', 'basics', 'trading', 'technology', 'economics', 'history'],
            status: ['all', 'not-started', 'in-progress', 'completed'],
            duration: ['all', 'short', 'medium', 'long'] // <15min, 15-45min, >45min
        };

        this.sortOptions = {
            name: 'Alphabetical',
            difficulty: 'Difficulty',
            duration: 'Duration',
            date: 'Date Added',
            progress: 'Progress',
            popularity: 'Popularity'
        };

        // Topic data
        this.topicsData = new Map();
        this.progressData = new Map();
        this.bookmarksData = new Set();
    }

    /**
     * Initialize the topic list component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('TopicList already initialized');
            return;
        }

        try {
            // Merge options
            this.defaultOptions = { ...this.defaultOptions, ...options };

            // Load topic data
            this.loadTopicsData();

            // Load user progress
            this.loadProgressData();

            // Load bookmarks
            this.loadBookmarksData();

            // Enhance existing topic lists
            this.enhanceExistingTopicLists();

            // Set up global event listeners
            this.setupGlobalEventListeners();

            this.isInitialized = true;
            console.log('TopicList initialized successfully');

        } catch (error) {
            console.error('Failed to initialize topic list:', error);
        }
    }

    /**
     * Enhance existing topic list elements in the DOM
     */
    enhanceExistingTopicLists() {
        const existingLists = document.querySelectorAll('[data-topic-list], .topic-list');
        existingLists.forEach(list => {
            if (!list.dataset.topicListEnhanced) {
                this.enhanceTopicList(list);
            }
        });
    }

    /**
     * Set up global event listeners
     */
    setupGlobalEventListeners() {
        // Listen for topic progress updates
        document.addEventListener('topicProgressUpdate', (e) => {
            if (e.detail && e.detail.topicId) {
                this.updateTopicProgress(e.detail.topicId, e.detail.progress);
            }
        });

        // Listen for bookmark changes
        document.addEventListener('topicBookmarkToggle', (e) => {
            if (e.detail && e.detail.topicId) {
                this.toggleTopicBookmark(e.detail.topicId);
            }
        });
    }

    /**
     * Create a new topic list
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Topic list options
     * @returns {string} Topic list ID
     */
    create(container, options = {}) {
        if (!container) {
            console.error('Container element is required for topic list');
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
        this.topicLists.set(listId, {
            container: container,
            options: listOptions,
            filteredTopics: [],
            currentFilter: { difficulty: 'all', category: 'all', status: 'all', duration: 'all' },
            currentSort: 'name',
            sortOrder: 'asc',
            searchQuery: '',
            currentPage: 1
        });

        container.dataset.listId = listId;

        // Load and render topics
        if (listOptions.autoLoad) {
            this.loadAndRenderTopics(listId);
        }

        return listId;
    }

    /**
     * Enhance an existing topic list element
     * @param {HTMLElement} container - Topic list container element
     * @param {Object} options - Enhancement options
     */
    enhanceTopicList(container, options = {}) {
        if (!container || container.dataset.topicListEnhanced) return;

        const listId = this.create(container, options);
        container.dataset.topicListEnhanced = 'true';

        return listId;
    }

    /**
     * Set up list container
     * @param {HTMLElement} container - Container element
     * @param {Object} options - List options
     */
    setupListContainer(container, options) {
        container.classList.add('topic-list-container');
        container.classList.add(`view-${options.viewMode}`);

        if (options.enableProgress) {
            container.classList.add('with-progress');
        }
    }

    /**
     * Create list HTML structure
     * @param {HTMLElement} container - Container element
     * @param {string} listId - List ID
     */
    createListStructure(container, listId) {
        const structure = `
            <div class="topic-list-header">
                <div class="list-title">
                    <h3>Educational Topics</h3>
                    <div class="topic-count" id="topicCount-${listId}">
                        <span class="count">0</span> topics
                    </div>
                </div>

                <div class="list-controls">
                    ${this.defaultOptions.enableSearch ? `
                        <div class="search-section">
                            <input type="text" class="search-input" placeholder="Search topics..." id="topicSearch-${listId}">
                            <button class="btn btn-sm clear-search" id="clearSearch-${listId}">✕</button>
                        </div>
                    ` : ''}

                    <div class="view-controls">
                        <button class="btn btn-sm view-btn ${this.defaultOptions.viewMode === 'grid' ? 'active' : ''}"
                                data-view="grid" id="gridView-${listId}">⊞</button>
                        <button class="btn btn-sm view-btn ${this.defaultOptions.viewMode === 'list' ? 'active' : ''}"
                                data-view="list" id="listView-${listId}">☰</button>
                        <button class="btn btn-sm view-btn ${this.defaultOptions.viewMode === 'compact' ? 'active' : ''}"
                                data-view="compact" id="compactView-${listId}">⋯</button>
                    </div>
                </div>
            </div>

            ${this.defaultOptions.enableFiltering ? `
                <div class="filters-section" id="filtersSection-${listId}">
                    <div class="filter-group">
                        <label>Difficulty:</label>
                        <select class="filter-select" data-filter="difficulty" id="difficultyFilter-${listId}">
                            ${this.renderFilterOptions('difficulty')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>Category:</label>
                        <select class="filter-select" data-filter="category" id="categoryFilter-${listId}">
                            ${this.renderFilterOptions('category')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>Status:</label>
                        <select class="filter-select" data-filter="status" id="statusFilter-${listId}">
                            ${this.renderFilterOptions('status')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>Duration:</label>
                        <select class="filter-select" data-filter="duration" id="durationFilter-${listId}">
                            ${this.renderFilterOptions('duration')}
                        </select>
                    </div>

                    <button class="btn btn-sm clear-filters" id="clearFilters-${listId}">Clear All</button>
                </div>
            ` : ''}

            ${this.defaultOptions.enableSorting ? `
                <div class="sorting-section" id="sortingSection-${listId}">
                    <div class="sort-group">
                        <label>Sort by:</label>
                        <select class="sort-select" id="sortBy-${listId}">
                            ${this.renderSortOptions()}
                        </select>
                        <button class="btn btn-sm sort-direction" id="sortDirection-${listId}" title="Sort Direction">↑</button>
                    </div>
                </div>
            ` : ''}

            <div class="topic-list-content" id="topicListContent-${listId}">
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <span>Loading topics...</span>
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
            const label = option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ');
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
        // Search input
        const searchInput = container.querySelector(`#topicSearch-${listId}`);
        if (searchInput) {
            let searchTimeout;
            const searchHandler = () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performSearch(listId, searchInput.value);
                }, 300);
            };

            const cleanup = addEventListener(searchInput, 'input', searchHandler);
            this.eventListeners.push(cleanup);
        }

        // Clear search
        const clearSearch = container.querySelector(`#clearSearch-${listId}`);
        if (clearSearch) {
            const cleanup = addEventListener(clearSearch, 'click', () => {
                this.clearSearch(listId);
            });
            this.eventListeners.push(cleanup);
        }

        // View mode buttons
        const viewButtons = container.querySelectorAll('.view-btn');
        viewButtons.forEach(button => {
            const cleanup = addEventListener(button, 'click', () => {
                this.setViewMode(listId, button.dataset.view);
            });
            this.eventListeners.push(cleanup);
        });

        // Filter selects
        const filterSelects = container.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            const cleanup = addEventListener(select, 'change', () => {
                this.applyFilter(listId, select.dataset.filter, select.value);
            });
            this.eventListeners.push(cleanup);
        });

        // Clear filters
        const clearFilters = container.querySelector(`#clearFilters-${listId}`);
        if (clearFilters) {
            const cleanup = addEventListener(clearFilters, 'click', () => {
                this.clearAllFilters(listId);
            });
            this.eventListeners.push(cleanup);
        }

        // Sort controls
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

        // Pagination controls
        this.setupPaginationEventListeners(container, listId);

        // Topic item interactions (delegated)
        const topicListContent = container.querySelector(`#topicListContent-${listId}`);
        if (topicListContent) {
            const clickHandler = (e) => {
                this.handleTopicClick(e, listId);
            };

            const cleanup = addEventListener(topicListContent, 'click', clickHandler);
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Set up pagination event listeners
     * @param {HTMLElement} container - Container element
     * @param {string} listId - List ID
     */
    setupPaginationEventListeners(container, listId) {
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
     * Load and render topics
     * @param {string} listId - List ID
     */
    async loadAndRenderTopics(listId) {
        const listData = this.topicLists.get(listId);
        if (!listData) return;

        try {
            this.showLoadingState(listId);

            // Load topics from service or local data
            const topics = await this.loadTopics();

            // Store topics data
            this.topicsData.set(listId, topics);

            // Apply initial filtering and sorting
            this.applyFiltersAndSorting(listId);

            // Render topics
            this.renderTopics(listId);

            this.hideLoadingState(listId);

        } catch (error) {
            console.error('Failed to load topics:', error);
            this.showErrorState(listId);
        }
    }

    /**
     * Load topics data
     * @returns {Array} Topics array
     */
    async loadTopics() {
        // This would typically load from an API or service
        // For now, return mock data
        return [
            {
                id: 'bitcoin-basics',
                title: 'Bitcoin Basics',
                description: 'Learn the fundamentals of Bitcoin and how it works',
                category: 'basics',
                difficulty: 'beginner',
                estimatedTime: 15,
                prerequisites: [],
                tags: ['bitcoin', 'cryptocurrency', 'basics'],
                thumbnail: '/images/bitcoin-basics.jpg',
                dateAdded: '2023-01-15',
                popularity: 95,
                completedBy: 1250
            },
            {
                id: 'blockchain-technology',
                title: 'Understanding Blockchain',
                description: 'Deep dive into blockchain technology and its applications',
                category: 'technology',
                difficulty: 'intermediate',
                estimatedTime: 30,
                prerequisites: ['bitcoin-basics'],
                tags: ['blockchain', 'technology', 'distributed'],
                thumbnail: '/images/blockchain.jpg',
                dateAdded: '2023-01-20',
                popularity: 87,
                completedBy: 890
            },
            {
                id: 'trading-strategies',
                title: 'Trading Strategies',
                description: 'Learn effective strategies for trading Bitcoin and cryptocurrencies',
                category: 'trading',
                difficulty: 'advanced',
                estimatedTime: 45,
                prerequisites: ['bitcoin-basics', 'blockchain-technology'],
                tags: ['trading', 'strategy', 'markets'],
                thumbnail: '/images/trading.jpg',
                dateAdded: '2023-01-25',
                popularity: 76,
                completedBy: 654
            },
            {
                id: 'bitcoin-history',
                title: 'History of Bitcoin',
                description: 'Explore the fascinating history and evolution of Bitcoin',
                category: 'history',
                difficulty: 'beginner',
                estimatedTime: 20,
                prerequisites: [],
                tags: ['history', 'satoshi', 'evolution'],
                thumbnail: '/images/history.jpg',
                dateAdded: '2023-02-01',
                popularity: 82,
                completedBy: 1050
            },
            {
                id: 'economics-bitcoin',
                title: 'Bitcoin Economics',
                description: 'Understanding the economic principles behind Bitcoin',
                category: 'economics',
                difficulty: 'intermediate',
                estimatedTime: 35,
                prerequisites: ['bitcoin-basics'],
                tags: ['economics', 'monetary', 'policy'],
                thumbnail: '/images/economics.jpg',
                dateAdded: '2023-02-05',
                popularity: 73,
                completedBy: 720
            }
        ];
    }

    /**
     * Apply filters and sorting
     * @param {string} listId - List ID
     */
    applyFiltersAndSorting(listId) {
        const listData = this.topicLists.get(listId);
        const topics = this.topicsData.get(listId);

        if (!listData || !topics) return;

        // Start with all topics
        let filteredTopics = [...topics];

        // Apply search filter
        if (listData.searchQuery) {
            filteredTopics = this.filterBySearch(filteredTopics, listData.searchQuery);
        }

        // Apply category filters
        Object.entries(listData.currentFilter).forEach(([filterType, filterValue]) => {
            if (filterValue !== 'all') {
                filteredTopics = this.filterByType(filteredTopics, filterType, filterValue);
            }
        });

        // Apply sorting
        filteredTopics = this.sortTopics(filteredTopics, listData.currentSort, listData.sortOrder);

        // Store filtered and sorted topics
        listData.filteredTopics = filteredTopics;

        // Reset to first page
        listData.currentPage = 1;
    }

    /**
     * Filter topics by search query
     * @param {Array} topics - Topics array
     * @param {string} query - Search query
     * @returns {Array} Filtered topics
     */
    filterBySearch(topics, query) {
        const lowerQuery = query.toLowerCase();
        return topics.filter(topic => {
            return topic.title.toLowerCase().includes(lowerQuery) ||
                   topic.description.toLowerCase().includes(lowerQuery) ||
                   topic.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
        });
    }

    /**
     * Filter topics by type
     * @param {Array} topics - Topics array
     * @param {string} filterType - Filter type
     * @param {string} filterValue - Filter value
     * @returns {Array} Filtered topics
     */
    filterByType(topics, filterType, filterValue) {
        switch (filterType) {
            case 'difficulty':
                return topics.filter(topic => topic.difficulty === filterValue);

            case 'category':
                return topics.filter(topic => topic.category === filterValue);

            case 'status':
                return topics.filter(topic => {
                    const progress = this.getTopicProgress(topic.id);
                    switch (filterValue) {
                        case 'not-started':
                            return progress === 0;
                        case 'in-progress':
                            return progress > 0 && progress < 100;
                        case 'completed':
                            return progress === 100;
                        default:
                            return true;
                    }
                });

            case 'duration':
                return topics.filter(topic => {
                    const time = topic.estimatedTime;
                    switch (filterValue) {
                        case 'short':
                            return time < 15;
                        case 'medium':
                            return time >= 15 && time <= 45;
                        case 'long':
                            return time > 45;
                        default:
                            return true;
                    }
                });

            default:
                return topics;
        }
    }

    /**
     * Sort topics
     * @param {Array} topics - Topics array
     * @param {string} sortBy - Sort field
     * @param {string} sortOrder - Sort order (asc/desc)
     * @returns {Array} Sorted topics
     */
    sortTopics(topics, sortBy, sortOrder) {
        const sortedTopics = [...topics].sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'name':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case 'difficulty':
                    const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
                    aValue = difficultyOrder[a.difficulty] || 0;
                    bValue = difficultyOrder[b.difficulty] || 0;
                    break;
                case 'duration':
                    aValue = a.estimatedTime;
                    bValue = b.estimatedTime;
                    break;
                case 'date':
                    aValue = new Date(a.dateAdded).getTime();
                    bValue = new Date(b.dateAdded).getTime();
                    break;
                case 'progress':
                    aValue = this.getTopicProgress(a.id);
                    bValue = this.getTopicProgress(b.id);
                    break;
                case 'popularity':
                    aValue = a.popularity || 0;
                    bValue = b.popularity || 0;
                    break;
                default:
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
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

        return sortedTopics;
    }

    /**
     * Render topics
     * @param {string} listId - List ID
     */
    renderTopics(listId) {
        const listData = this.topicLists.get(listId);
        const topicListContent = getElementById(`topicListContent-${listId}`);

        if (!listData || !topicListContent) return;

        const { filteredTopics, currentPage, options } = listData;

        // Calculate pagination
        const startIndex = (currentPage - 1) * options.itemsPerPage;
        const endIndex = startIndex + options.itemsPerPage;
        const pageTopics = options.enablePagination ?
            filteredTopics.slice(startIndex, endIndex) :
            filteredTopics;

        // Render topics based on view mode
        let topicsHtml = '';

        if (pageTopics.length === 0) {
            topicsHtml = this.renderEmptyState(listData.searchQuery || listData.currentFilter);
        } else {
            topicsHtml = `<div class="topics-grid ${options.viewMode}-view">`;
            pageTopics.forEach(topic => {
                topicsHtml += this.renderTopicItem(topic, options);
            });
            topicsHtml += '</div>';
        }

        topicListContent.innerHTML = topicsHtml;

        // Update topic count
        this.updateTopicCount(listId, filteredTopics.length);

        // Update pagination
        if (options.enablePagination) {
            this.updatePagination(listId, filteredTopics.length);
        }
    }

    /**
     * Render topic item
     * @param {Object} topic - Topic data
     * @param {Object} options - List options
     * @returns {string} HTML for topic item
     */
    renderTopicItem(topic, options) {
        const progress = this.getTopicProgress(topic.id);
        const isBookmarked = this.isTopicBookmarked(topic.id);
        const difficultyClass = `difficulty-${topic.difficulty}`;
        const progressClass = progress === 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started';

        if (options.viewMode === 'compact') {
            return this.renderCompactTopicItem(topic, progress, isBookmarked, difficultyClass, progressClass);
        } else if (options.viewMode === 'list') {
            return this.renderListTopicItem(topic, progress, isBookmarked, difficultyClass, progressClass, options);
        } else {
            return this.renderGridTopicItem(topic, progress, isBookmarked, difficultyClass, progressClass, options);
        }
    }

    /**
     * Render grid topic item
     * @param {Object} topic - Topic data
     * @param {number} progress - Progress percentage
     * @param {boolean} isBookmarked - Is bookmarked
     * @param {string} difficultyClass - Difficulty CSS class
     * @param {string} progressClass - Progress CSS class
     * @param {Object} options - List options
     * @returns {string} HTML for grid topic item
     */
    renderGridTopicItem(topic, progress, isBookmarked, difficultyClass, progressClass, options) {
        return `
            <div class="topic-item grid-item ${difficultyClass} ${progressClass}" data-topic-id="${topic.id}">
                <div class="topic-thumbnail">
                    <img src="${topic.thumbnail}" alt="${topic.title}" loading="lazy"
                         onerror="this.src='/images/default-topic.jpg'">

                    ${options.enableProgress && progress > 0 ? `
                        <div class="progress-overlay">
                            <div class="progress-circle">
                                <svg viewBox="0 0 36 36" class="circular-chart">
                                    <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                    <path class="circle-progress" stroke-dasharray="${progress}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                </svg>
                                <div class="percentage">${Math.round(progress)}%</div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="topic-content">
                    <div class="topic-header">
                        <h4 class="topic-title">${topic.title}</h4>

                        ${options.enableBookmarks ? `
                            <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}"
                                    data-action="bookmark" data-topic-id="${topic.id}"
                                    title="${isBookmarked ? 'Remove bookmark' : 'Add bookmark'}">
                                🔖
                            </button>
                        ` : ''}
                    </div>

                    <p class="topic-description">${topic.description}</p>

                    <div class="topic-meta">
                        ${options.showDifficulty ? `
                            <span class="difficulty-badge ${difficultyClass}">
                                ${topic.difficulty}
                            </span>
                        ` : ''}

                        ${options.showEstimatedTime ? `
                            <span class="time-badge">
                                ⏱️ ${topic.estimatedTime}m
                            </span>
                        ` : ''}

                        <span class="category-badge">
                            ${topic.category}
                        </span>
                    </div>

                    ${options.showPrerequisites && topic.prerequisites.length > 0 ? `
                        <div class="prerequisites">
                            <span class="prereq-label">Prerequisites:</span>
                            ${topic.prerequisites.map(prereq => `<span class="prereq-item">${prereq}</span>`).join('')}
                        </div>
                    ` : ''}

                    <div class="topic-stats">
                        <span class="completion-stat">
                            👥 ${formatNumber(topic.completedBy)} completed
                        </span>
                        <span class="popularity-stat">
                            ⭐ ${topic.popularity}%
                        </span>
                    </div>
                </div>

                <div class="topic-actions">
                    <button class="btn btn-primary start-topic-btn"
                            data-action="start" data-topic-id="${topic.id}">
                        ${progress === 0 ? 'Start Learning' : progress === 100 ? 'Review' : 'Continue'}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render list topic item
     * @param {Object} topic - Topic data
     * @param {number} progress - Progress percentage
     * @param {boolean} isBookmarked - Is bookmarked
     * @param {string} difficultyClass - Difficulty CSS class
     * @param {string} progressClass - Progress CSS class
     * @param {Object} options - List options
     * @returns {string} HTML for list topic item
     */
    renderListTopicItem(topic, progress, isBookmarked, difficultyClass, progressClass, options) {
        return `
            <div class="topic-item list-item ${difficultyClass} ${progressClass}" data-topic-id="${topic.id}">
                <div class="topic-info">
                    <div class="topic-main">
                        <h4 class="topic-title">${topic.title}</h4>
                        <p class="topic-description">${topic.description}</p>
                    </div>

                    <div class="topic-details">
                        ${options.showDifficulty ? `
                            <span class="difficulty-badge ${difficultyClass}">${topic.difficulty}</span>
                        ` : ''}

                        ${options.showEstimatedTime ? `
                            <span class="time-badge">⏱️ ${topic.estimatedTime}m</span>
                        ` : ''}

                        <span class="category-badge">${topic.category}</span>
                    </div>
                </div>

                ${options.enableProgress ? `
                    <div class="topic-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">${Math.round(progress)}%</span>
                    </div>
                ` : ''}

                <div class="topic-actions">
                    ${options.enableBookmarks ? `
                        <button class="btn btn-sm bookmark-btn ${isBookmarked ? 'bookmarked' : ''}"
                                data-action="bookmark" data-topic-id="${topic.id}">
                            🔖
                        </button>
                    ` : ''}

                    <button class="btn btn-primary start-topic-btn"
                            data-action="start" data-topic-id="${topic.id}">
                        ${progress === 0 ? 'Start' : progress === 100 ? 'Review' : 'Continue'}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render compact topic item
     * @param {Object} topic - Topic data
     * @param {number} progress - Progress percentage
     * @param {boolean} isBookmarked - Is bookmarked
     * @param {string} difficultyClass - Difficulty CSS class
     * @param {string} progressClass - Progress CSS class
     * @returns {string} HTML for compact topic item
     */
    renderCompactTopicItem(topic, progress, isBookmarked, difficultyClass, progressClass) {
        return `
            <div class="topic-item compact-item ${difficultyClass} ${progressClass}" data-topic-id="${topic.id}">
                <div class="compact-content">
                    <span class="topic-title">${topic.title}</span>
                    <span class="topic-meta">
                        <span class="difficulty">${topic.difficulty}</span>
                        <span class="time">⏱️ ${topic.estimatedTime}m</span>
                        ${progress > 0 ? `<span class="progress">${Math.round(progress)}%</span>` : ''}
                    </span>
                </div>

                <div class="compact-actions">
                    ${isBookmarked ? `<span class="bookmark-indicator">🔖</span>` : ''}
                    <button class="btn btn-sm start-topic-btn"
                            data-action="start" data-topic-id="${topic.id}">
                        ${progress === 0 ? 'Start' : progress === 100 ? '✓' : '▶'}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render empty state
     * @param {string|Object} filter - Search query or filter object
     * @returns {string} HTML for empty state
     */
    renderEmptyState(filter) {
        const isSearch = typeof filter === 'string' && filter.length > 0;
        const hasActiveFilters = typeof filter === 'object' &&
            Object.values(filter).some(value => value !== 'all');

        return `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h3>
                    ${isSearch ? 'No topics found' :
                      hasActiveFilters ? 'No topics match your filters' :
                      'No topics available'}
                </h3>
                <p>
                    ${isSearch ? `Try searching for something else or check your spelling.` :
                      hasActiveFilters ? `Try adjusting your filters to see more topics.` :
                      `Topics will appear here when they are available.`}
                </p>
                ${isSearch || hasActiveFilters ? `
                    <button class="btn btn-primary clear-all-btn">Clear Filters</button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Handle topic click events
     * @param {Event} e - Click event
     * @param {string} listId - List ID
     */
    handleTopicClick(e, listId) {
        const action = e.target.closest('[data-action]')?.dataset.action;
        const topicId = e.target.closest('[data-topic-id]')?.dataset.topicId;

        if (!action || !topicId) return;

        e.preventDefault();

        switch (action) {
            case 'start':
                this.startTopic(topicId);
                break;
            case 'bookmark':
                this.toggleTopicBookmark(topicId);
                this.refreshTopicDisplay(listId, topicId);
                break;
        }
    }

    /**
     * Start learning topic
     * @param {string} topicId - Topic ID
     */
    startTopic(topicId) {
        // Navigate to topic content
        this.services.router?.navigate(`#education/${topicId}`);

        // Emit topic started event
        this.emitEvent('topicStarted', { topicId });
    }

    /**
     * Perform search
     * @param {string} listId - List ID
     * @param {string} query - Search query
     */
    performSearch(listId, query) {
        const listData = this.topicLists.get(listId);
        if (!listData) return;

        listData.searchQuery = query;
        this.applyFiltersAndSorting(listId);
        this.renderTopics(listId);
    }

    /**
     * Clear search
     * @param {string} listId - List ID
     */
    clearSearch(listId) {
        const searchInput = getElementById(`topicSearch-${listId}`);
        if (searchInput) {
            searchInput.value = '';
        }

        this.performSearch(listId, '');
    }

    /**
     * Set view mode
     * @param {string} listId - List ID
     * @param {string} viewMode - View mode
     */
    setViewMode(listId, viewMode) {
        const listData = this.topicLists.get(listId);
        if (!listData) return;

        listData.options.viewMode = viewMode;

        // Update container class
        listData.container.className = listData.container.className
            .replace(/view-\w+/, `view-${viewMode}`);

        // Update button states
        const viewButtons = listData.container.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewMode);
        });

        // Re-render topics
        this.renderTopics(listId);
    }

    /**
     * Apply filter
     * @param {string} listId - List ID
     * @param {string} filterType - Filter type
     * @param {string} filterValue - Filter value
     */
    applyFilter(listId, filterType, filterValue) {
        const listData = this.topicLists.get(listId);
        if (!listData) return;

        listData.currentFilter[filterType] = filterValue;
        this.applyFiltersAndSorting(listId);
        this.renderTopics(listId);
    }

    /**
     * Clear all filters
     * @param {string} listId - List ID
     */
    clearAllFilters(listId) {
        const listData = this.topicLists.get(listId);
        if (!listData) return;

        // Reset filters
        Object.keys(listData.currentFilter).forEach(key => {
            listData.currentFilter[key] = 'all';
        });

        // Reset search
        listData.searchQuery = '';

        // Update UI
        const filterSelects = listData.container.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.value = 'all';
        });

        const searchInput = getElementById(`topicSearch-${listData.container.dataset.listId}`);
        if (searchInput) {
            searchInput.value = '';
        }

        // Re-apply and render
        this.applyFiltersAndSorting(listId);
        this.renderTopics(listId);
    }

    /**
     * Apply sorting
     * @param {string} listId - List ID
     * @param {string} sortBy - Sort field
     */
    applySorting(listId, sortBy) {
        const listData = this.topicLists.get(listId);
        if (!listData) return;

        listData.currentSort = sortBy;
        this.applyFiltersAndSorting(listId);
        this.renderTopics(listId);
    }

    /**
     * Toggle sort direction
     * @param {string} listId - List ID
     */
    toggleSortDirection(listId) {
        const listData = this.topicLists.get(listId);
        if (!listData) return;

        listData.sortOrder = listData.sortOrder === 'asc' ? 'desc' : 'asc';

        // Update button
        const sortDirection = getElementById(`sortDirection-${listId}`);
        if (sortDirection) {
            sortDirection.textContent = listData.sortOrder === 'asc' ? '↑' : '↓';
        }

        this.applyFiltersAndSorting(listId);
        this.renderTopics(listId);
    }

    /**
     * Go to previous page
     * @param {string} listId - List ID
     */
    goToPreviousPage(listId) {
        const listData = this.topicLists.get(listId);
        if (!listData || listData.currentPage <= 1) return;

        listData.currentPage--;
        this.renderTopics(listId);
    }

    /**
     * Go to next page
     * @param {string} listId - List ID
     */
    goToNextPage(listId) {
        const listData = this.topicLists.get(listId);
        if (!listData) return;

        const totalPages = Math.ceil(listData.filteredTopics.length / listData.options.itemsPerPage);
        if (listData.currentPage >= totalPages) return;

        listData.currentPage++;
        this.renderTopics(listId);
    }

    /**
     * Update topic count display
     * @param {string} listId - List ID
     * @param {number} count - Topic count
     */
    updateTopicCount(listId, count) {
        const topicCount = getElementById(`topicCount-${listId}`);
        if (topicCount) {
            const countSpan = topicCount.querySelector('.count');
            if (countSpan) {
                countSpan.textContent = count;
            }
        }
    }

    /**
     * Update pagination display
     * @param {string} listId - List ID
     * @param {number} totalItems - Total number of items
     */
    updatePagination(listId, totalItems) {
        const listData = this.topicLists.get(listId);
        const paginationSection = getElementById(`paginationSection-${listId}`);

        if (!listData || !paginationSection) return;

        const { currentPage, options } = listData;
        const totalPages = Math.ceil(totalItems / options.itemsPerPage);

        if (totalPages <= 1) {
            hideElement(paginationSection);
            return;
        }

        showElement(paginationSection);

        // Update page info
        const pageInfo = getElementById(`pageInfo-${listId}`);
        if (pageInfo) {
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        }

        // Update navigation buttons
        const prevBtn = getElementById(`prevPage-${listId}`);
        const nextBtn = getElementById(`nextPage-${listId}`);

        if (prevBtn) {
            prevBtn.disabled = currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = currentPage >= totalPages;
        }

        // Update page numbers
        this.updatePageNumbers(listId, currentPage, totalPages);
    }

    /**
     * Update page numbers display
     * @param {string} listId - List ID
     * @param {number} currentPage - Current page
     * @param {number} totalPages - Total pages
     */
    updatePageNumbers(listId, currentPage, totalPages) {
        const pageNumbers = getElementById(`pageNumbers-${listId}`);
        if (!pageNumbers) return;

        let numbersHtml = '';
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        // Adjust start page if we're near the end
        if (endPage === totalPages) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        // First page and ellipsis
        if (startPage > 1) {
            numbersHtml += `<button class="btn btn-sm page-number" data-page="1">1</button>`;
            if (startPage > 2) {
                numbersHtml += `<span class="page-ellipsis">...</span>`;
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            numbersHtml += `<button class="btn btn-sm page-number ${activeClass}" data-page="${i}">${i}</button>`;
        }

        // Last page and ellipsis
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                numbersHtml += `<span class="page-ellipsis">...</span>`;
            }
            numbersHtml += `<button class="btn btn-sm page-number" data-page="${totalPages}">${totalPages}</button>`;
        }

        pageNumbers.innerHTML = numbersHtml;

        // Set up page number click handlers
        const pageNumberBtns = pageNumbers.querySelectorAll('.page-number');
        pageNumberBtns.forEach(btn => {
            const cleanup = addEventListener(btn, 'click', () => {
                this.goToPage(listId, parseInt(btn.dataset.page));
            });
            this.eventListeners.push(cleanup);
        });
    }

    /**
     * Go to specific page
     * @param {string} listId - List ID
     * @param {number} page - Page number
     */
    goToPage(listId, page) {
        const listData = this.topicLists.get(listId);
        if (!listData) return;

        listData.currentPage = page;
        this.renderTopics(listId);
    }

    /**
     * Get topic progress
     * @param {string} topicId - Topic ID
     * @returns {number} Progress percentage
     */
    getTopicProgress(topicId) {
        return this.progressData.get(topicId) || 0;
    }

    /**
     * Update topic progress
     * @param {string} topicId - Topic ID
     * @param {number} progress - Progress percentage
     */
    updateTopicProgress(topicId, progress) {
        this.progressData.set(topicId, progress);

        // Refresh all topic lists
        for (const listId of this.topicLists.keys()) {
            this.refreshTopicDisplay(listId, topicId);
        }

        // Save progress
        this.saveProgressData();
    }

    /**
     * Check if topic is bookmarked
     * @param {string} topicId - Topic ID
     * @returns {boolean} Is bookmarked
     */
    isTopicBookmarked(topicId) {
        return this.bookmarksData.has(topicId);
    }

    /**
     * Toggle topic bookmark
     * @param {string} topicId - Topic ID
     */
    toggleTopicBookmark(topicId) {
        if (this.bookmarksData.has(topicId)) {
            this.bookmarksData.delete(topicId);
        } else {
            this.bookmarksData.add(topicId);
        }

        // Save bookmarks
        this.saveBookmarksData();

        this.services.notificationService?.showSuccess(
            this.bookmarksData.has(topicId) ? 'Topic bookmarked' : 'Bookmark removed'
        );
    }

    /**
     * Refresh topic display
     * @param {string} listId - List ID
     * @param {string} topicId - Topic ID
     */
    refreshTopicDisplay(listId, topicId) {
        const topicElement = document.querySelector(`[data-list-id="${listId}"] [data-topic-id="${topicId}"]`);
        if (topicElement) {
            // Find the topic data and re-render just this item
            const topics = this.topicsData.get(listId);
            const topic = topics?.find(t => t.id === topicId);

            if (topic) {
                const listData = this.topicLists.get(listId);
                const newHtml = this.renderTopicItem(topic, listData.options);
                topicElement.outerHTML = newHtml;
            }
        }
    }

    /**
     * Show loading state
     * @param {string} listId - List ID
     */
    showLoadingState(listId) {
        const topicListContent = getElementById(`topicListContent-${listId}`);
        if (topicListContent) {
            topicListContent.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <span>Loading topics...</span>
                </div>
            `;
        }
    }

    /**
     * Hide loading state
     * @param {string} listId - List ID
     */
    hideLoadingState(listId) {
        // Loading state will be replaced by topic content
    }

    /**
     * Show error state
     * @param {string} listId - List ID
     */
    showErrorState(listId) {
        const topicListContent = getElementById(`topicListContent-${listId}`);
        if (topicListContent) {
            topicListContent.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Failed to Load Topics</h3>
                    <p>Unable to load educational topics. Please try again.</p>
                    <button class="btn btn-primary retry-load" data-list-id="${listId}">Retry</button>
                </div>
            `;

            // Set up retry button
            const retryBtn = topicListContent.querySelector('.retry-load');
            if (retryBtn) {
                const cleanup = addEventListener(retryBtn, 'click', () => {
                    this.loadAndRenderTopics(listId);
                });
                this.eventListeners.push(cleanup);
            }
        }
    }

    /**
     * Load topics data from storage
     */
    loadTopicsData() {
        // Would load from an external source in a real implementation
    }

    /**
     * Load progress data from storage
     */
    loadProgressData() {
        try {
            const saved = localStorage.getItem('topic_progress');
            if (saved) {
                const data = JSON.parse(saved);
                Object.entries(data).forEach(([topicId, progress]) => {
                    this.progressData.set(topicId, progress);
                });
            }
        } catch (error) {
            console.error('Failed to load progress data:', error);
        }
    }

    /**
     * Save progress data to storage
     */
    saveProgressData() {
        try {
            const data = Object.fromEntries(this.progressData);
            localStorage.setItem('topic_progress', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save progress data:', error);
        }
    }

    /**
     * Load bookmarks data from storage
     */
    loadBookmarksData() {
        try {
            const saved = localStorage.getItem('topic_bookmarks');
            if (saved) {
                const data = JSON.parse(saved);
                this.bookmarksData = new Set(data);
            }
        } catch (error) {
            console.error('Failed to load bookmarks data:', error);
        }
    }

    /**
     * Save bookmarks data to storage
     */
    saveBookmarksData() {
        try {
            const data = Array.from(this.bookmarksData);
            localStorage.setItem('topic_bookmarks', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save bookmarks data:', error);
        }
    }

    /**
     * Generate unique list ID
     * @returns {string} List ID
     */
    generateListId() {
        return 'topic_list_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get list data
     * @param {string} listId - List ID
     * @returns {Object} List data
     */
    getListData(listId) {
        return this.topicLists.get(listId);
    }

    /**
     * Remove topic list
     * @param {string} listId - List ID
     */
    removeTopicList(listId) {
        this.topicLists.delete(listId);
        this.topicsData.delete(listId);
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    emitEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...detail, component: 'TopicList' }
        });
        document.dispatchEvent(event);
    }

    /**
     * Destroy the topic list component
     */
    destroy() {
        console.log('Destroying topic list component');

        // Save data
        this.saveProgressData();
        this.saveBookmarksData();

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up topic list event listener:', error);
            }
        });
        this.eventListeners = [];

        // Clear list instances
        this.topicLists.clear();
        this.topicsData.clear();
        this.progressData.clear();
        this.bookmarksData.clear();

        // Reset state
        this.isInitialized = false;

        console.log('Topic list component destroyed');
    }
}

// Create and export singleton instance
export const topicList = new TopicList();

// Convenience functions
export function createTopicList(container, options = {}) {
    return topicList.create(container, options);
}

export function updateTopicProgress(topicId, progress) {
    topicList.updateTopicProgress(topicId, progress);
}

export default topicList;