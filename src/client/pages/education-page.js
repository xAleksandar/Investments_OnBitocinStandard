/**
 * Education Page Component
 * Manages educational content display, navigation, and reading progress
 * Extracted from monolithic BitcoinGame class as part of Task 5.3
 */

import { getElementById, hideElement, showElement, addEventListener } from '../utils/dom-helpers.js';
import { formatters } from '../utils/formatters.js';

export class EducationPage {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Educational content state
        this.currentContent = null;
        this.availableTopics = [
            {
                id: 'why-bitcoin',
                title: 'Why Bitcoin?',
                description: 'Understanding Bitcoin as neutral, apolitical money',
                link: '#education/why-bitcoin',
                estimatedTime: 8
            },
            {
                id: 'why-not-gold',
                title: 'Why Not Gold?',
                description: 'The limitations of gold in the digital age',
                link: '#education/why-not-gold',
                estimatedTime: 6
            },
            {
                id: 'fiat-experiment',
                title: 'The Fiat Experiment',
                description: 'How we moved away from sound money',
                link: '#education/fiat-experiment',
                estimatedTime: 10
            }
        ];

        // Reading progress tracking
        this.readingProgressHandler = null;
        this.sectionObserver = null;
    }

    /**
     * Initialize education page
     * @param {string} contentType - Optional specific content to load
     */
    async init(contentType = null) {
        if (this.isInitialized) {
            console.log('EducationPage already initialized');
            return;
        }

        try {
            console.log('Initializing education page', contentType ? `with content: ${contentType}` : '');

            // Check if education page DOM exists
            const educationPage = getElementById('educationPage');
            if (!educationPage) {
                throw new Error('Education page DOM element not found');
            }

            // Initialize DOM components
            this.initializeDOMComponents();

            // Load specific content or show overview
            if (contentType) {
                await this.loadEducationalContent(contentType);
            } else {
                this.showEducationOverview();
            }

            // Set up event listeners
            this.setupEventListeners();

            this.isInitialized = true;
            console.log('Education page initialized successfully');

        } catch (error) {
            console.error('Failed to initialize education page:', error);
            this.services.notificationService?.showError('Failed to load education page');
            throw error;
        }
    }

    /**
     * Initialize DOM components for education page
     */
    initializeDOMComponents() {
        const educationContent = getElementById('educationContent');
        if (!educationContent) {
            console.warn('Education content container not found');
            return;
        }

        // Ensure education page is visible
        const educationPage = getElementById('educationPage');
        if (educationPage) {
            showElement(educationPage);
        }
    }

    /**
     * Show education overview with topic links
     */
    showEducationOverview() {
        const educationContent = getElementById('educationContent');
        if (!educationContent) return;

        const t = this.getTranslationFunction();

        // Generate topic cards HTML
        const topicCards = this.availableTopics.map(topic => `
            <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                 data-topic="${topic.id}">
                <h3 class="text-xl font-semibold text-gray-800 mb-3">${topic.title}</h3>
                <p class="text-gray-600 mb-4">${topic.description}</p>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-500">${topic.estimatedTime} ${t('education.minutesReading')}</span>
                    <span class="text-orange-500 font-medium">${t('education.readMore')} →</span>
                </div>
            </div>
        `).join('');

        educationContent.innerHTML = `
            <div class="max-w-4xl mx-auto py-8">
                <div class="text-center mb-12">
                    <h1 class="text-4xl font-bold text-gray-800 mb-4" data-translate="education.title">Education</h1>
                    <p class="text-xl text-gray-600 max-w-2xl mx-auto" data-translate="education.subtitle">
                        Learn about Bitcoin, sound money principles, and why Bitcoin serves as the ultimate measuring stick for value.
                    </p>
                </div>

                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    ${topicCards}
                </div>

                <div class="bg-gray-50 rounded-lg p-8 text-center">
                    <h2 class="text-2xl font-semibold text-gray-800 mb-4" data-translate="education.getStarted">Get Started</h2>
                    <p class="text-gray-600 mb-6" data-translate="education.getStartedDescription">
                        Begin your journey to understanding Bitcoin as a unit of account. Start with any topic that interests you.
                    </p>
                    <div class="flex flex-wrap justify-center gap-4">
                        <button class="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
                                data-topic="why-bitcoin">
                            <span data-translate="education.startWithBitcoin">Start with "Why Bitcoin?"</span>
                        </button>
                        <button class="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                                onclick="window.location.hash = '#portfolio'">
                            <span data-translate="education.tryPortfolio">Try the Portfolio</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Update translations if service is available
        if (this.services.translationService) {
            this.services.translationService.updatePageTranslations();
        }
    }

    /**
     * Load specific educational content
     * @param {string} contentType - Type of content to load
     */
    async loadEducationalContent(contentType) {
        const educationContent = getElementById('educationContent');
        if (!educationContent) return;

        try {
            // Show loading state
            educationContent.innerHTML = `
                <div class="flex justify-center items-center py-20">
                    <div class="text-xl text-gray-600">Loading educational content...</div>
                </div>
            `;

            // Get current language
            const currentLang = this.services.translationService?.getCurrentLanguage() || 'en';

            // Dynamically import the appropriate content file from public directory
            const contentModule = await import(`../../../public/content/educational/${contentType}-${currentLang}.js`);
            const content = contentModule.default || contentModule.content;

            if (!content) {
                throw new Error(`Content not found for ${contentType}`);
            }

            // Store current content
            this.currentContent = content;

            // Render the content
            this.renderEducationalContent(content);

            // Initialize reading progress and section tracking
            this.initializeReadingProgress();
            this.initializeActiveSection();

            console.log(`Educational content loaded: ${contentType}`);

        } catch (error) {
            console.error('Failed to load educational content:', error);
            this.showContentError();
        }
    }

    /**
     * Render educational content with full layout
     * @param {Object} content - Content object with sections, TOC, etc.
     */
    renderEducationalContent(content) {
        const educationContent = getElementById('educationContent');
        if (!educationContent || !content) return;

        const t = this.getTranslationFunction();

        // Generate table of contents
        const tocItems = content.tableOfContents.map(item => `
            <li>
                <a href="#${item.id}"
                   class="text-orange-500 hover:text-orange-600 transition-colors block py-1 text-sm">
                    ${item.title}
                </a>
            </li>
        `).join('');

        // Generate sections
        const sectionsHtml = content.sections.map(section => `
            <section id="${section.id}" class="mb-12 scroll-mt-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">${section.title}</h2>
                <div class="prose prose-lg max-w-none text-gray-700">
                    ${section.content}
                </div>
            </section>
        `).join('');

        // Generate related topics if available
        const relatedTopicsHtml = content.relatedTopics && content.relatedTopics.length > 0 ? `
            <div class="mt-12 pt-8 border-t border-gray-200">
                <h3 class="text-xl font-semibold text-gray-800 mb-6" data-translate="education.relatedTopics">Related Topics</h3>
                <div class="grid md:grid-cols-2 gap-4">
                    ${content.relatedTopics.map(topic => `
                        <a href="${topic.link}"
                           class="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <h4 class="font-semibold text-gray-800 mb-2">${topic.title}</h4>
                            <p class="text-gray-600 text-sm">${topic.description}</p>
                        </a>
                    `).join('')}
                </div>
            </div>
        ` : '';

        educationContent.innerHTML = `
            <!-- Reading Progress Bar -->
            <div class="fixed top-0 left-0 w-full z-50">
                <div id="readingProgress" class="h-1 bg-orange-500 transition-all duration-300" style="width: 0%"></div>
            </div>

            <div class="max-w-4xl mx-auto py-8">
                <!-- Header -->
                <div class="mb-8">
                    <nav class="text-sm mb-4">
                        <a href="#education"
                           class="text-orange-500 hover:text-orange-600 font-medium cursor-pointer"
                           data-translate="education.backToEducation">Back to Education</a>
                        <span class="mx-2 text-gray-500">→</span>
                        <span class="text-gray-700">${content.title}</span>
                    </nav>
                    <h1 class="text-4xl font-bold text-gray-800 mb-4">${content.title}</h1>
                    <p class="text-xl text-gray-600 mb-6">${content.subtitle}</p>
                    <div class="flex items-center space-x-6 text-sm text-gray-500">
                        <span>${content.readingTime} ${t('education.minutesReading')}</span>
                        <span>${t('education.lastUpdatedLabel')}: ${content.lastUpdated}</span>
                    </div>
                </div>

                <div class="grid lg:grid-cols-4 gap-8">
                    <!-- Table of Contents -->
                    <div class="lg:col-span-1">
                        <div class="sticky top-4">
                            <h3 class="font-semibold text-gray-800 mb-4" data-translate="education.tableOfContents">Table of Contents</h3>
                            <ul class="space-y-1" id="tableOfContents">
                                ${tocItems}
                            </ul>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div class="lg:col-span-3">
                        <article class="prose prose-lg max-w-none" id="educationArticle">
                            ${sectionsHtml}
                        </article>

                        ${relatedTopicsHtml}

                        <!-- Navigation -->
                        <div class="mt-12 pt-8 border-t border-gray-200">
                            <div class="flex justify-between items-center">
                                <button id="backToEducation"
                                        class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                                    <span data-translate="education.backToEducation">← Back to Education</span>
                                </button>
                                ${this.getNextTopicButton(content)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Update translations
        if (this.services.translationService) {
            this.services.translationService.updatePageTranslations();
        }
    }

    /**
     * Get next topic button HTML
     * @param {Object} content - Current content object
     * @returns {string} Next topic button HTML
     */
    getNextTopicButton(content) {
        // Find current topic index
        const currentTopic = this.availableTopics.find(topic => content.title.includes(topic.title.split('?')[0]));
        if (!currentTopic) return '';

        const currentIndex = this.availableTopics.indexOf(currentTopic);
        const nextTopic = this.availableTopics[currentIndex + 1];

        if (nextTopic) {
            return `
                <a href="${nextTopic.link}"
                   class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
                    Next: ${nextTopic.title} →
                </a>
            `;
        }

        return `
            <a href="#portfolio"
               class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
               Try the Portfolio →
            </a>
        `;
    }

    /**
     * Show content error message
     */
    showContentError() {
        const educationContent = getElementById('educationContent');
        if (!educationContent) return;

        const t = this.getTranslationFunction();

        educationContent.innerHTML = `
            <div class="max-w-4xl mx-auto py-8">
                <div class="text-center">
                    <h1 class="text-2xl font-bold text-red-600 mb-4">Content Not Available</h1>
                    <p class="text-gray-600 mb-6">Sorry, this educational content is not available in the selected language.</p>
                    <button onclick="window.location.hash = '#education'"
                            class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors">
                        Back to Education
                    </button>
                </div>
            </div>
        `;
    }

    // ===== READING PROGRESS AND NAVIGATION =====

    /**
     * Initialize reading progress tracking
     */
    initializeReadingProgress() {
        const progressBar = getElementById('readingProgress');
        if (!progressBar) return;

        // Remove any existing scroll listeners
        this.cleanupReadingProgress();

        this.readingProgressHandler = () => {
            const article = getElementById('educationArticle');
            if (!article) return;

            const articleTop = article.offsetTop;
            const articleHeight = article.offsetHeight;
            const scrollTop = window.pageYOffset;
            const windowHeight = window.innerHeight;

            // Calculate reading progress
            const startReading = articleTop - windowHeight * 0.3;
            const endReading = articleTop + articleHeight - windowHeight * 0.7;
            const totalReadingDistance = endReading - startReading;

            let progress = 0;
            if (scrollTop > startReading) {
                progress = Math.min((scrollTop - startReading) / totalReadingDistance, 1);
            }

            progressBar.style.width = `${progress * 100}%`;
        };

        // Add scroll listener with cleanup tracking
        const scrollCleanup = addEventListener(window, 'scroll', this.readingProgressHandler);
        this.eventListeners.push(scrollCleanup);
    }

    /**
     * Initialize active section highlighting in TOC
     */
    initializeActiveSection() {
        // Remove any existing intersection observer
        this.cleanupSectionObserver();

        const sections = document.querySelectorAll('section[id]');
        const tocLinks = document.querySelectorAll('#tableOfContents a[href^="#"]');

        if (sections.length === 0 || tocLinks.length === 0) return;

        this.sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Remove active class from all TOC links
                    tocLinks.forEach(link => {
                        link.classList.remove('font-semibold', 'text-orange-600');
                        link.classList.add('text-orange-500');
                    });

                    // Add active class to current section link
                    const activeLink = document.querySelector(`#tableOfContents a[href="#${entry.target.id}"]`);
                    if (activeLink) {
                        activeLink.classList.remove('text-orange-500');
                        activeLink.classList.add('font-semibold', 'text-orange-600');
                    }
                }
            });
        }, {
            rootMargin: '-50px 0px -50px 0px',
            threshold: 0.1
        });

        // Observe all sections
        sections.forEach(section => {
            this.sectionObserver.observe(section);
        });
    }

    // ===== EVENT HANDLING =====

    /**
     * Set up education page event listeners
     */
    setupEventListeners() {
        // Topic navigation from overview
        const topicCards = document.querySelectorAll('[data-topic]');
        topicCards.forEach(card => {
            const cleanup = addEventListener(card, 'click', (e) => {
                const topicId = e.currentTarget.dataset.topic;
                if (topicId) {
                    window.location.hash = `#education/${topicId}`;
                }
            });
            this.eventListeners.push(cleanup);
        });

        // Back to education navigation
        const backButton = getElementById('backToEducation');
        if (backButton) {
            const cleanup = addEventListener(backButton, 'click', (e) => {
                e.preventDefault();
                window.location.hash = '#education';
            });
            this.eventListeners.push(cleanup);
        }

        // Smooth scrolling for TOC links
        const tocLinks = document.querySelectorAll('#tableOfContents a[href^="#"]');
        tocLinks.forEach(link => {
            const cleanup = addEventListener(link, 'click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
            this.eventListeners.push(cleanup);
        });
    }

    // ===== CLEANUP AND UTILITIES =====

    /**
     * Clean up reading progress tracking
     */
    cleanupReadingProgress() {
        if (this.readingProgressHandler) {
            window.removeEventListener('scroll', this.readingProgressHandler);
            this.readingProgressHandler = null;
        }
    }

    /**
     * Clean up section observer
     */
    cleanupSectionObserver() {
        if (this.sectionObserver) {
            this.sectionObserver.disconnect();
            this.sectionObserver = null;
        }
    }

    /**
     * Get translation function
     * @returns {Function} Translation function
     */
    getTranslationFunction() {
        return this.services.translationService?.translate?.bind(this.services.translationService) || ((key) => key);
    }

    /**
     * Render education page (called by router)
     */
    render() {
        // Education page rendering is handled by init() method
        // This method is here for consistency with other page components
        console.log('Education page render called');
    }

    /**
     * Destroy education page and clean up resources
     */
    destroy() {
        console.log('Destroying education page');

        // Clean up reading progress tracking
        this.cleanupReadingProgress();

        // Clean up section observer
        this.cleanupSectionObserver();

        // Clean up all event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up event listener:', error);
            }
        });
        this.eventListeners = [];

        // Clear content state
        this.currentContent = null;

        // Reset initialization flag
        this.isInitialized = false;

        console.log('Education page destroyed');
    }
}

export default EducationPage;
