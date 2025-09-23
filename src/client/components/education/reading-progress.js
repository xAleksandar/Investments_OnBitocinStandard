/**
 * Reading Progress Component
 * Tracks and displays reading progress with analytics and achievement system
 * Extracted from monolithic BitcoinGame class as part of Task 6.4
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';
import { formatDate, formatNumber } from '../../utils/formatters.js';

export class ReadingProgress {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Progress tracker instances
        this.progressTrackers = new Map();

        // Progress configuration
        this.defaultOptions = {
            trackScrollProgress: true,
            trackTimeSpent: true,
            trackSectionCompletion: true,
            showProgressBar: true,
            showTimeEstimate: true,
            showAchievements: true,
            enableMilestones: true,
            autoSave: true,
            saveInterval: 30000, // 30 seconds
            completionThreshold: 80 // percentage
        };

        // Reading analytics
        this.readingAnalytics = {
            sessionsCount: 0,
            totalTimeSpent: 0,
            wordsRead: 0,
            sectionsCompleted: 0,
            averageReadingSpeed: 0,
            achievements: []
        };

        // Session data
        this.currentSession = null;

        // Auto-save timer
        this.saveTimer = null;
    }

    /**
     * Initialize the reading progress component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('ReadingProgress already initialized');
            return;
        }

        try {
            // Merge options
            this.defaultOptions = { ...this.defaultOptions, ...options };

            // Load analytics data
            this.loadAnalyticsData();

            // Enhance existing progress trackers
            this.enhanceExistingTrackers();

            // Set up global event listeners
            this.setupGlobalEventListeners();

            // Start auto-save if enabled
            if (this.defaultOptions.autoSave) {
                this.startAutoSave();
            }

            this.isInitialized = true;
            console.log('ReadingProgress initialized successfully');

        } catch (error) {
            console.error('Failed to initialize reading progress:', error);
        }
    }

    /**
     * Enhance existing progress tracker elements in the DOM
     */
    enhanceExistingTrackers() {
        const existingTrackers = document.querySelectorAll('[data-reading-progress], .reading-progress');
        existingTrackers.forEach(tracker => {
            if (!tracker.dataset.progressEnhanced) {
                this.enhanceTracker(tracker);
            }
        });
    }

    /**
     * Set up global event listeners
     */
    setupGlobalEventListeners() {
        // Listen for content rendered events
        document.addEventListener('contentRendered', (e) => {
            if (e.detail && e.detail.rendererId) {
                this.initializeContentProgress(e.detail.rendererId, e.detail.content);
            }
        });

        // Listen for section navigation
        document.addEventListener('sectionNavigated', (e) => {
            if (e.detail && e.detail.sectionId) {
                this.updateCurrentSection(e.detail.sectionId);
            }
        });

        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.pauseSession();
            } else {
                this.resumeSession();
            }
        });

        // Listen for beforeunload to save progress
        const cleanup = addEventListener(window, 'beforeunload', () => {
            this.saveAllProgress();
        });
        this.eventListeners.push(cleanup);
    }

    /**
     * Create a new reading progress tracker
     * @param {HTMLElement} container - Container element
     * @param {Object} contentData - Content data
     * @param {Object} options - Tracker options
     * @returns {string} Tracker ID
     */
    create(container, contentData = null, options = {}) {
        if (!container) {
            console.error('Container element is required for reading progress tracker');
            return null;
        }

        const trackerOptions = { ...this.defaultOptions, ...options };
        const trackerId = this.generateTrackerId();

        // Set up container
        this.setupTrackerContainer(container, trackerOptions);

        // Create tracker structure
        this.createTrackerStructure(container, trackerId);

        // Set up event listeners
        this.setupTrackerEventListeners(container, trackerId);

        // Store tracker instance
        this.progressTrackers.set(trackerId, {
            container: container,
            options: trackerOptions,
            contentData: contentData,
            sessionData: this.createSessionData(),
            progress: this.createProgressData()
        });

        container.dataset.trackerId = trackerId;

        // Initialize content if provided
        if (contentData) {
            this.initializeContentProgress(trackerId, contentData);
        }

        return trackerId;
    }

    /**
     * Enhance an existing tracker element
     * @param {HTMLElement} container - Tracker container element
     * @param {Object} options - Enhancement options
     */
    enhanceTracker(container, options = {}) {
        if (!container || container.dataset.progressEnhanced) return;

        // Extract content data from container or context
        const contentData = this.extractContentDataFromElement(container);
        const trackerId = this.create(container, contentData, options);

        container.dataset.progressEnhanced = 'true';
        return trackerId;
    }

    /**
     * Set up tracker container
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Tracker options
     */
    setupTrackerContainer(container, options) {
        container.classList.add('reading-progress-tracker');

        if (options.showProgressBar) {
            container.classList.add('with-progress-bar');
        }
    }

    /**
     * Create tracker HTML structure
     * @param {HTMLElement} container - Container element
     * @param {string} trackerId - Tracker ID
     */
    createTrackerStructure(container, trackerId) {
        const structure = `
            ${this.defaultOptions.showProgressBar ? `
                <div class="progress-header">
                    <div class="progress-info">
                        <span class="progress-label">Reading Progress</span>
                        <span class="progress-percentage" id="progressPercentage-${trackerId}">0%</span>
                    </div>
                    ${this.defaultOptions.showTimeEstimate ? `
                        <div class="time-info">
                            <span class="time-spent" id="timeSpent-${trackerId}">0m</span>
                            <span class="time-remaining" id="timeRemaining-${trackerId}">--</span>
                        </div>
                    ` : ''}
                </div>

                <div class="progress-bar-container">
                    <div class="progress-bar" id="progressBar-${trackerId}">
                        <div class="progress-fill" id="progressFill-${trackerId}"></div>
                        <div class="progress-sections" id="progressSections-${trackerId}"></div>
                    </div>
                </div>
            ` : ''}

            <div class="progress-details" id="progressDetails-${trackerId}">
                <div class="session-stats">
                    <div class="stat-item">
                        <span class="stat-label">Words Read:</span>
                        <span class="stat-value" id="wordsRead-${trackerId}">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Sections:</span>
                        <span class="stat-value" id="sectionsProgress-${trackerId}">0/0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Reading Speed:</span>
                        <span class="stat-value" id="readingSpeed-${trackerId}">-- wpm</span>
                    </div>
                </div>

                ${this.defaultOptions.showAchievements ? `
                    <div class="achievements-section" id="achievements-${trackerId}">
                        <h4>Achievements</h4>
                        <div class="achievements-list" id="achievementsList-${trackerId}">
                            <div class="no-achievements">No achievements yet</div>
                        </div>
                    </div>
                ` : ''}

                ${this.defaultOptions.enableMilestones ? `
                    <div class="milestones-section" id="milestones-${trackerId}">
                        <h4>Milestones</h4>
                        <div class="milestones-list" id="milestonesList-${trackerId}"></div>
                    </div>
                ` : ''}
            </div>

            <div class="progress-controls">
                <button class="btn btn-sm toggle-details-btn" id="toggleDetails-${trackerId}">
                    Show Details
                </button>
                <button class="btn btn-sm reset-progress-btn" id="resetProgress-${trackerId}">
                    Reset Progress
                </button>
            </div>
        `;

        container.innerHTML = structure;
    }

    /**
     * Set up tracker event listeners
     * @param {HTMLElement} container - Container element
     * @param {string} trackerId - Tracker ID
     */
    setupTrackerEventListeners(container, trackerId) {
        // Toggle details button
        const toggleDetailsBtn = container.querySelector(`#toggleDetails-${trackerId}`);
        if (toggleDetailsBtn) {
            const cleanup = addEventListener(toggleDetailsBtn, 'click', () => {
                this.toggleDetails(trackerId);
            });
            this.eventListeners.push(cleanup);
        }

        // Reset progress button
        const resetProgressBtn = container.querySelector(`#resetProgress-${trackerId}`);
        if (resetProgressBtn) {
            const cleanup = addEventListener(resetProgressBtn, 'click', () => {
                this.resetProgress(trackerId);
            });
            this.eventListeners.push(cleanup);
        }

        // Set up scroll tracking if enabled
        if (this.defaultOptions.trackScrollProgress) {
            this.setupScrollTracking(trackerId);
        }
    }

    /**
     * Set up scroll tracking
     * @param {string} trackerId - Tracker ID
     */
    setupScrollTracking(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData) return;

        // Find scrollable content area
        const contentArea = trackerData.container.closest('.content-renderer')?.querySelector('.content-main') ||
                           document.querySelector('.content-main') ||
                           window;

        if (contentArea) {
            const scrollHandler = () => {
                this.updateScrollProgress(trackerId);
            };

            const cleanup = addEventListener(contentArea, 'scroll', scrollHandler);
            this.eventListeners.push(cleanup);
        }
    }

    /**
     * Initialize content progress
     * @param {string} trackerId - Tracker ID
     * @param {Object} contentData - Content data
     */
    initializeContentProgress(trackerId, contentData) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData) return;

        // Store content data
        trackerData.contentData = contentData;

        // Initialize session
        this.startSession(trackerId);

        // Analyze content structure
        this.analyzeContentStructure(trackerId);

        // Generate milestones
        if (this.defaultOptions.enableMilestones) {
            this.generateMilestones(trackerId);
        }

        // Update progress display
        this.updateProgressDisplay(trackerId);
    }

    /**
     * Create session data
     * @returns {Object} Session data
     */
    createSessionData() {
        return {
            startTime: Date.now(),
            lastActiveTime: Date.now(),
            timeSpent: 0,
            wordsRead: 0,
            sectionsVisited: new Set(),
            currentSection: null,
            isPaused: false
        };
    }

    /**
     * Create progress data
     * @returns {Object} Progress data
     */
    createProgressData() {
        return {
            scrollProgress: 0,
            sectionsCompleted: new Set(),
            totalSections: 0,
            readingSpeed: 0,
            completionPercentage: 0,
            lastSavedTime: Date.now()
        };
    }

    /**
     * Start reading session
     * @param {string} trackerId - Tracker ID
     */
    startSession(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData) return;

        // Initialize session
        trackerData.sessionData = this.createSessionData();
        this.currentSession = trackerId;

        // Start time tracking
        this.startTimeTracking(trackerId);

        // Update analytics
        this.readingAnalytics.sessionsCount++;

        // Emit session started event
        this.emitEvent('sessionStarted', { trackerId });
    }

    /**
     * Start time tracking
     * @param {string} trackerId - Tracker ID
     */
    startTimeTracking(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData || !this.defaultOptions.trackTimeSpent) return;

        // Update time every second
        trackerData.timeTrackingInterval = setInterval(() => {
            this.updateTimeSpent(trackerId);
        }, 1000);
    }

    /**
     * Update time spent
     * @param {string} trackerId - Tracker ID
     */
    updateTimeSpent(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData || trackerData.sessionData.isPaused) return;

        const now = Date.now();
        const elapsed = now - trackerData.sessionData.lastActiveTime;

        // Only count time if user is actively reading (< 30 seconds since last activity)
        if (elapsed < 30000) {
            trackerData.sessionData.timeSpent += 1000; // 1 second
            trackerData.sessionData.lastActiveTime = now;

            // Update reading speed
            this.updateReadingSpeed(trackerId);

            // Update display
            this.updateTimeDisplay(trackerId);

            // Check for achievements
            this.checkTimeAchievements(trackerId);
        }
    }

    /**
     * Update reading speed calculation
     * @param {string} trackerId - Tracker ID
     */
    updateReadingSpeed(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData) return;

        const timeSpentMinutes = trackerData.sessionData.timeSpent / 60000;
        if (timeSpentMinutes > 0) {
            trackerData.progress.readingSpeed = Math.round(trackerData.sessionData.wordsRead / timeSpentMinutes);
        }
    }

    /**
     * Update scroll progress
     * @param {string} trackerId - Tracker ID
     */
    updateScrollProgress(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData) return;

        // Calculate scroll progress
        const contentArea = this.findContentArea(trackerId);
        if (!contentArea) return;

        const scrollTop = contentArea.scrollTop || window.pageYOffset;
        const scrollHeight = contentArea.scrollHeight || document.documentElement.scrollHeight;
        const clientHeight = contentArea.clientHeight || window.innerHeight;

        const maxScroll = scrollHeight - clientHeight;
        const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;

        trackerData.progress.scrollProgress = Math.min(progress, 100);

        // Update user activity timestamp
        trackerData.sessionData.lastActiveTime = Date.now();

        // Update progress display
        this.updateProgressDisplay(trackerId);

        // Check section completion
        this.checkSectionCompletion(trackerId);

        // Check achievements
        this.checkScrollAchievements(trackerId);

        // Emit progress update event
        this.emitEvent('progressUpdate', {
            trackerId,
            progress: trackerData.progress.scrollProgress
        });
    }

    /**
     * Find content area for tracking
     * @param {string} trackerId - Tracker ID
     * @returns {HTMLElement|Window} Content area
     */
    findContentArea(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData) return window;

        // Try to find associated content area
        const contentRenderer = trackerData.container.closest('.content-renderer');
        if (contentRenderer) {
            const contentMain = contentRenderer.querySelector('.content-main');
            if (contentMain) return contentMain;
        }

        // Fallback to window
        return window;
    }

    /**
     * Analyze content structure
     * @param {string} trackerId - Tracker ID
     */
    analyzeContentStructure(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData) return;

        const contentArea = this.findContentArea(trackerId);
        if (!contentArea || contentArea === window) return;

        // Count sections (headings)
        const headings = contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6');
        trackerData.progress.totalSections = headings.length;

        // Estimate word count
        const textContent = contentArea.textContent || '';
        const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
        trackerData.contentData.estimatedWordCount = wordCount;

        // Calculate estimated reading time (average 200 wpm)
        trackerData.contentData.estimatedReadingTime = Math.ceil(wordCount / 200);

        // Generate section markers
        this.generateSectionMarkers(trackerId, headings);
    }

    /**
     * Generate section markers for progress bar
     * @param {string} trackerId - Tracker ID
     * @param {NodeList} headings - Heading elements
     */
    generateSectionMarkers(trackerId, headings) {
        const progressSections = getElementById(`progressSections-${trackerId}`);
        if (!progressSections || headings.length === 0) return;

        const contentArea = this.findContentArea(trackerId);
        if (!contentArea || contentArea === window) return;

        const contentHeight = contentArea.scrollHeight;

        let markersHtml = '';
        headings.forEach((heading, index) => {
            const position = (heading.offsetTop / contentHeight) * 100;
            markersHtml += `
                <div class="section-marker"
                     style="left: ${position}%"
                     data-section="${heading.id || index}"
                     title="${heading.textContent}">
                </div>
            `;
        });

        progressSections.innerHTML = markersHtml;
    }

    /**
     * Update current section
     * @param {string} sectionId - Section ID
     */
    updateCurrentSection(sectionId) {
        for (const [trackerId, trackerData] of this.progressTrackers) {
            if (trackerData.sessionData.currentSection !== sectionId) {
                trackerData.sessionData.currentSection = sectionId;
                trackerData.sessionData.sectionsVisited.add(sectionId);

                // Emit section changed event
                this.emitEvent('sectionChanged', { trackerId, sectionId });
            }
        }
    }

    /**
     * Check section completion
     * @param {string} trackerId - Tracker ID
     */
    checkSectionCompletion(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData || !this.defaultOptions.trackSectionCompletion) return;

        const currentSection = trackerData.sessionData.currentSection;
        if (!currentSection) return;

        // Mark section as completed if scroll progress is above threshold
        if (trackerData.progress.scrollProgress >= this.defaultOptions.completionThreshold &&
            !trackerData.progress.sectionsCompleted.has(currentSection)) {

            trackerData.progress.sectionsCompleted.add(currentSection);

            // Update completion percentage
            const completedCount = trackerData.progress.sectionsCompleted.size;
            const totalCount = trackerData.progress.totalSections;
            trackerData.progress.completionPercentage = totalCount > 0 ?
                (completedCount / totalCount) * 100 : 0;

            // Check achievements
            this.checkCompletionAchievements(trackerId);

            // Emit section completed event
            this.emitEvent('sectionCompleted', { trackerId, sectionId: currentSection });
        }
    }

    /**
     * Update progress display
     * @param {string} trackerId - Tracker ID
     */
    updateProgressDisplay(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData) return;

        // Update progress percentage
        const progressPercentage = getElementById(`progressPercentage-${trackerId}`);
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(trackerData.progress.scrollProgress)}%`;
        }

        // Update progress bar
        const progressFill = getElementById(`progressFill-${trackerId}`);
        if (progressFill) {
            progressFill.style.width = `${trackerData.progress.scrollProgress}%`;
        }

        // Update sections progress
        const sectionsProgress = getElementById(`sectionsProgress-${trackerId}`);
        if (sectionsProgress) {
            const completed = trackerData.progress.sectionsCompleted.size;
            const total = trackerData.progress.totalSections;
            sectionsProgress.textContent = `${completed}/${total}`;
        }

        // Update words read
        const wordsRead = getElementById(`wordsRead-${trackerId}`);
        if (wordsRead) {
            wordsRead.textContent = formatNumber(trackerData.sessionData.wordsRead);
        }

        // Update reading speed
        const readingSpeed = getElementById(`readingSpeed-${trackerId}`);
        if (readingSpeed) {
            readingSpeed.textContent = trackerData.progress.readingSpeed > 0 ?
                `${trackerData.progress.readingSpeed} wpm` : '-- wpm';
        }
    }

    /**
     * Update time display
     * @param {string} trackerId - Tracker ID
     */
    updateTimeDisplay(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData) return;

        // Update time spent
        const timeSpent = getElementById(`timeSpent-${trackerId}`);
        if (timeSpent) {
            const minutes = Math.floor(trackerData.sessionData.timeSpent / 60000);
            timeSpent.textContent = `${minutes}m`;
        }

        // Update time remaining estimate
        const timeRemaining = getElementById(`timeRemaining-${trackerId}`);
        if (timeRemaining && trackerData.contentData.estimatedReadingTime) {
            const progress = trackerData.progress.scrollProgress / 100;
            const estimatedTotal = trackerData.contentData.estimatedReadingTime;
            const remaining = Math.max(0, estimatedTotal - (estimatedTotal * progress));
            timeRemaining.textContent = `${Math.ceil(remaining)}m left`;
        }
    }

    /**
     * Generate milestones
     * @param {string} trackerId - Tracker ID
     */
    generateMilestones(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        const milestonesList = getElementById(`milestonesList-${trackerId}`);

        if (!trackerData || !milestonesList) return;

        const milestones = [
            { percentage: 25, title: 'Quarter Way', icon: '🎯', description: 'Keep going!' },
            { percentage: 50, title: 'Halfway Point', icon: '🏃', description: 'You\'re doing great!' },
            { percentage: 75, title: 'Three Quarters', icon: '🚀', description: 'Almost there!' },
            { percentage: 100, title: 'Completed', icon: '🏆', description: 'Congratulations!' }
        ];

        let milestonesHtml = '';
        milestones.forEach(milestone => {
            const isReached = trackerData.progress.scrollProgress >= milestone.percentage;
            milestonesHtml += `
                <div class="milestone-item ${isReached ? 'reached' : 'pending'}">
                    <div class="milestone-icon">${milestone.icon}</div>
                    <div class="milestone-content">
                        <div class="milestone-title">${milestone.title}</div>
                        <div class="milestone-description">${milestone.description}</div>
                        <div class="milestone-progress">${milestone.percentage}%</div>
                    </div>
                    <div class="milestone-status">
                        ${isReached ? '✅' : '⭕'}
                    </div>
                </div>
            `;
        });

        milestonesList.innerHTML = milestonesHtml;
    }

    /**
     * Check for time-based achievements
     * @param {string} trackerId - Tracker ID
     */
    checkTimeAchievements(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData) return;

        const timeSpentMinutes = trackerData.sessionData.timeSpent / 60000;

        const timeAchievements = [
            { threshold: 5, id: 'first_5_minutes', title: 'Getting Started', description: '5 minutes of reading' },
            { threshold: 15, id: 'focused_reader', title: 'Focused Reader', description: '15 minutes of continuous reading' },
            { threshold: 30, id: 'dedicated_learner', title: 'Dedicated Learner', description: '30 minutes of reading' },
            { threshold: 60, id: 'deep_dive', title: 'Deep Dive', description: '1 hour of reading' }
        ];

        timeAchievements.forEach(achievement => {
            if (timeSpentMinutes >= achievement.threshold &&
                !this.hasAchievement(trackerId, achievement.id)) {
                this.unlockAchievement(trackerId, achievement);
            }
        });
    }

    /**
     * Check for scroll-based achievements
     * @param {string} trackerId - Tracker ID
     */
    checkScrollAchievements(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData) return;

        const scrollAchievements = [
            { threshold: 25, id: 'quarter_complete', title: 'Getting There', description: '25% progress' },
            { threshold: 50, id: 'halfway_hero', title: 'Halfway Hero', description: '50% progress' },
            { threshold: 75, id: 'almost_done', title: 'Almost Done', description: '75% progress' },
            { threshold: 100, id: 'completionist', title: 'Completionist', description: '100% complete' }
        ];

        scrollAchievements.forEach(achievement => {
            if (trackerData.progress.scrollProgress >= achievement.threshold &&
                !this.hasAchievement(trackerId, achievement.id)) {
                this.unlockAchievement(trackerId, achievement);
            }
        });
    }

    /**
     * Check for completion achievements
     * @param {string} trackerId - Tracker ID
     */
    checkCompletionAchievements(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData) return;

        const completedSections = trackerData.progress.sectionsCompleted.size;

        const completionAchievements = [
            { threshold: 1, id: 'first_section', title: 'First Section', description: 'Completed your first section' },
            { threshold: 5, id: 'section_master', title: 'Section Master', description: '5 sections completed' },
            { threshold: 10, id: 'knowledge_seeker', title: 'Knowledge Seeker', description: '10 sections completed' }
        ];

        completionAchievements.forEach(achievement => {
            if (completedSections >= achievement.threshold &&
                !this.hasAchievement(trackerId, achievement.id)) {
                this.unlockAchievement(trackerId, achievement);
            }
        });
    }

    /**
     * Check if user has achievement
     * @param {string} trackerId - Tracker ID
     * @param {string} achievementId - Achievement ID
     * @returns {boolean} Has achievement
     */
    hasAchievement(trackerId, achievementId) {
        return this.readingAnalytics.achievements.some(a => a.id === achievementId);
    }

    /**
     * Unlock achievement
     * @param {string} trackerId - Tracker ID
     * @param {Object} achievement - Achievement data
     */
    unlockAchievement(trackerId, achievement) {
        const achievementData = {
            ...achievement,
            unlockedAt: Date.now(),
            trackerId: trackerId
        };

        this.readingAnalytics.achievements.push(achievementData);

        // Update achievements display
        this.updateAchievementsDisplay(trackerId);

        // Show achievement notification
        this.showAchievementNotification(achievementData);

        // Emit achievement unlocked event
        this.emitEvent('achievementUnlocked', { trackerId, achievement: achievementData });
    }

    /**
     * Update achievements display
     * @param {string} trackerId - Tracker ID
     */
    updateAchievementsDisplay(trackerId) {
        const achievementsList = getElementById(`achievementsList-${trackerId}`);
        if (!achievementsList) return;

        const trackerAchievements = this.readingAnalytics.achievements
            .filter(a => a.trackerId === trackerId)
            .sort((a, b) => b.unlockedAt - a.unlockedAt);

        if (trackerAchievements.length === 0) {
            achievementsList.innerHTML = '<div class="no-achievements">No achievements yet</div>';
            return;
        }

        let achievementsHtml = '';
        trackerAchievements.forEach(achievement => {
            achievementsHtml += `
                <div class="achievement-item">
                    <div class="achievement-icon">🏆</div>
                    <div class="achievement-content">
                        <div class="achievement-title">${achievement.title}</div>
                        <div class="achievement-description">${achievement.description}</div>
                        <div class="achievement-date">${formatDate(new Date(achievement.unlockedAt))}</div>
                    </div>
                </div>
            `;
        });

        achievementsList.innerHTML = achievementsHtml;
    }

    /**
     * Show achievement notification
     * @param {Object} achievement - Achievement data
     */
    showAchievementNotification(achievement) {
        this.services.notificationService?.showSuccess(
            `Achievement Unlocked: ${achievement.title}!`,
            { duration: 5000 }
        );
    }

    /**
     * Toggle details display
     * @param {string} trackerId - Tracker ID
     */
    toggleDetails(trackerId) {
        const progressDetails = getElementById(`progressDetails-${trackerId}`);
        const toggleBtn = getElementById(`toggleDetails-${trackerId}`);

        if (!progressDetails || !toggleBtn) return;

        const isVisible = progressDetails.style.display !== 'none';

        if (isVisible) {
            hideElement(progressDetails);
            toggleBtn.textContent = 'Show Details';
        } else {
            showElement(progressDetails);
            toggleBtn.textContent = 'Hide Details';
        }
    }

    /**
     * Reset progress
     * @param {string} trackerId - Tracker ID
     */
    resetProgress(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (!trackerData) return;

        if (confirm('Are you sure you want to reset your reading progress?')) {
            // Reset progress data
            trackerData.progress = this.createProgressData();
            trackerData.sessionData = this.createSessionData();

            // Update displays
            this.updateProgressDisplay(trackerId);
            this.updateTimeDisplay(trackerId);
            this.generateMilestones(trackerId);

            // Restart session
            this.startSession(trackerId);

            this.services.notificationService?.showSuccess('Reading progress has been reset');
        }
    }

    /**
     * Pause session
     */
    pauseSession() {
        if (this.currentSession) {
            const trackerData = this.progressTrackers.get(this.currentSession);
            if (trackerData) {
                trackerData.sessionData.isPaused = true;
            }
        }
    }

    /**
     * Resume session
     */
    resumeSession() {
        if (this.currentSession) {
            const trackerData = this.progressTrackers.get(this.currentSession);
            if (trackerData) {
                trackerData.sessionData.isPaused = false;
                trackerData.sessionData.lastActiveTime = Date.now();
            }
        }
    }

    /**
     * Start auto-save
     */
    startAutoSave() {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
        }

        this.saveTimer = setInterval(() => {
            this.saveAllProgress();
        }, this.defaultOptions.saveInterval);
    }

    /**
     * Save all progress
     */
    saveAllProgress() {
        try {
            // Save analytics data
            this.saveAnalyticsData();

            // Save individual tracker progress
            for (const [trackerId, trackerData] of this.progressTrackers) {
                this.saveTrackerProgress(trackerId, trackerData);
            }

        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }

    /**
     * Save tracker progress
     * @param {string} trackerId - Tracker ID
     * @param {Object} trackerData - Tracker data
     */
    saveTrackerProgress(trackerId, trackerData) {
        const progressKey = `reading_progress_${trackerId}`;
        const progressData = {
            progress: trackerData.progress,
            sessionData: {
                ...trackerData.sessionData,
                sectionsVisited: Array.from(trackerData.sessionData.sectionsVisited),
                sectionsCompleted: Array.from(trackerData.progress.sectionsCompleted)
            },
            lastSaved: Date.now()
        };

        localStorage.setItem(progressKey, JSON.stringify(progressData));
    }

    /**
     * Load analytics data
     */
    loadAnalyticsData() {
        try {
            const saved = localStorage.getItem('reading_analytics');
            if (saved) {
                this.readingAnalytics = { ...this.readingAnalytics, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load analytics data:', error);
        }
    }

    /**
     * Save analytics data
     */
    saveAnalyticsData() {
        try {
            localStorage.setItem('reading_analytics', JSON.stringify(this.readingAnalytics));
        } catch (error) {
            console.error('Failed to save analytics data:', error);
        }
    }

    /**
     * Extract content data from element
     * @param {HTMLElement} element - Element to extract from
     * @returns {Object} Content data
     */
    extractContentDataFromElement(element) {
        return {
            id: element.dataset.contentId || 'unknown',
            title: element.dataset.contentTitle || 'Untitled',
            type: element.dataset.contentType || 'article'
        };
    }

    /**
     * Generate unique tracker ID
     * @returns {string} Tracker ID
     */
    generateTrackerId() {
        return 'progress_tracker_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get tracker data
     * @param {string} trackerId - Tracker ID
     * @returns {Object} Tracker data
     */
    getTrackerData(trackerId) {
        return this.progressTrackers.get(trackerId);
    }

    /**
     * Get reading analytics
     * @returns {Object} Analytics data
     */
    getAnalytics() {
        return { ...this.readingAnalytics };
    }

    /**
     * Remove tracker
     * @param {string} trackerId - Tracker ID
     */
    removeTracker(trackerId) {
        const trackerData = this.progressTrackers.get(trackerId);
        if (trackerData) {
            // Clear time tracking interval
            if (trackerData.timeTrackingInterval) {
                clearInterval(trackerData.timeTrackingInterval);
            }

            this.progressTrackers.delete(trackerId);
        }
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    emitEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...detail, component: 'ReadingProgress' }
        });
        document.dispatchEvent(event);
    }

    /**
     * Destroy the reading progress component
     */
    destroy() {
        console.log('Destroying reading progress component');

        // Save all progress before destroying
        this.saveAllProgress();

        // Clear auto-save timer
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
            this.saveTimer = null;
        }

        // Clear time tracking intervals
        for (const trackerData of this.progressTrackers.values()) {
            if (trackerData.timeTrackingInterval) {
                clearInterval(trackerData.timeTrackingInterval);
            }
        }

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up reading progress event listener:', error);
            }
        });
        this.eventListeners = [];

        // Clear tracker instances
        this.progressTrackers.clear();

        // Reset state
        this.currentSession = null;
        this.isInitialized = false;

        console.log('Reading progress component destroyed');
    }
}

// Create and export singleton instance
export const readingProgress = new ReadingProgress();

// Convenience functions
export function createReadingProgress(container, contentData = null, options = {}) {
    return readingProgress.create(container, contentData, options);
}

export function updateProgress(trackerId, progress) {
    readingProgress.updateScrollProgress(trackerId);
}

export default readingProgress;