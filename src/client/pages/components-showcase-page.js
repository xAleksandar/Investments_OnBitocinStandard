/**
 * Components Showcase Page
 * Displays all available UI components with live examples and code samples
 * Serves as a practical component library for development reference
 */

import { Button } from '../components/ui/button.js';
import { Modal } from '../components/ui/modal.js';
import { Notification } from '../components/ui/notification.js';
import { LoadingSpinner } from '../components/ui/loading-spinner.js';
import { Tooltip } from '../components/ui/tooltip.js';

export class ComponentsShowcasePage {
    constructor(app) {
        this.app = app;
        this.isInitialized = false;
        this.components = new Map();

        // Initialize component instances for demo
        this.button = new Button();
        this.modal = new Modal();
        this.notification = new Notification();
        this.loadingSpinner = new LoadingSpinner();
        this.tooltip = new Tooltip();
    }

    async init() {
        if (this.isInitialized) return;

        console.log('🎨 Initializing Components Showcase Page...');

        try {
            await this.render();
            await this.setupEventListeners();
            await this.initializeComponents();

            this.isInitialized = true;
            console.log('✅ Components Showcase Page initialized');
        } catch (error) {
            console.error('❌ Error initializing Components Showcase Page:', error);
            throw error;
        }
    }

    async render() {
        const container = document.getElementById('main-content');
        if (!container) {
            throw new Error('Main content container not found');
        }

        container.innerHTML = `
            <div class="components-showcase">
                <!-- Header -->
                <div class="showcase-header bg-gradient-to-r from-orange-500 to-orange-600 text-white p-8 mb-8 rounded-lg">
                    <h1 class="text-4xl font-bold mb-4">🎨 Component Showcase</h1>
                    <p class="text-xl opacity-90">Interactive library of all UI components in the new modular architecture</p>
                    <div class="mt-4 text-sm opacity-75">
                        <span class="bg-white/20 px-3 py-1 rounded-full">22 Components</span>
                        <span class="bg-white/20 px-3 py-1 rounded-full ml-2">4 Categories</span>
                        <span class="bg-white/20 px-3 py-1 rounded-full ml-2">Live Examples</span>
                    </div>
                </div>

                <!-- Navigation -->
                <div class="showcase-nav mb-8 flex flex-wrap gap-4">
                    <button class="nav-btn active" data-section="ui">UI Components</button>
                    <button class="nav-btn" data-section="navigation">Navigation</button>
                    <button class="nav-btn" data-section="portfolio">Portfolio</button>
                    <button class="nav-btn" data-section="education">Education</button>
                    <button class="nav-btn" data-section="admin">Admin</button>
                </div>

                <!-- Component Sections -->
                <div class="showcase-content">
                    <!-- UI Components Section -->
                    <div class="component-section active" id="section-ui">
                        <h2 class="section-title">UI Components</h2>
                        <p class="section-description">Basic building blocks for user interface elements</p>

                        <div class="component-grid">
                            ${this.renderButtonShowcase()}
                            ${this.renderModalShowcase()}
                            ${this.renderNotificationShowcase()}
                            ${this.renderLoadingSpinnerShowcase()}
                            ${this.renderTooltipShowcase()}
                        </div>
                    </div>

                    <!-- Navigation Components Section -->
                    <div class="component-section" id="section-navigation">
                        <h2 class="section-title">Navigation Components</h2>
                        <p class="section-description">Components for app navigation and user menus</p>

                        <div class="component-grid">
                            ${this.renderNavigationInfo()}
                        </div>
                    </div>

                    <!-- Portfolio Components Section -->
                    <div class="component-section" id="section-portfolio">
                        <h2 class="section-title">Portfolio Components</h2>
                        <p class="section-description">Specialized components for portfolio management and trading</p>

                        <div class="component-grid">
                            ${this.renderPortfolioInfo()}
                        </div>
                    </div>

                    <!-- Education Components Section -->
                    <div class="component-section" id="section-education">
                        <h2 class="section-title">Education Components</h2>
                        <p class="section-description">Components for educational content and learning progress</p>

                        <div class="component-grid">
                            ${this.renderEducationInfo()}
                        </div>
                    </div>

                    <!-- Admin Components Section -->
                    <div class="component-section" id="section-admin">
                        <h2 class="section-title">Admin Components</h2>
                        <p class="section-description">Administrative interface components</p>

                        <div class="component-grid">
                            ${this.renderAdminInfo()}
                        </div>
                    </div>
                </div>

                <!-- Architecture Info -->
                <div class="architecture-info mt-12 p-6 bg-gray-50 rounded-lg">
                    <h3 class="text-xl font-bold mb-4">🏗️ Modular Architecture Benefits</h3>
                    <div class="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <h4 class="font-semibold text-orange-600">Separation of Concerns</h4>
                            <p>Each component handles specific functionality independently</p>
                        </div>
                        <div>
                            <h4 class="font-semibold text-orange-600">Reusability</h4>
                            <p>Components can be used across different pages and contexts</p>
                        </div>
                        <div>
                            <h4 class="font-semibold text-orange-600">Maintainability</h4>
                            <p>Small, focused files easier to understand and modify</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Demo Modal -->
            <div id="demo-modal" class="modal hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="modal-content bg-white rounded-lg p-6 max-w-md mx-4">
                    <h3 class="text-xl font-bold mb-4">Demo Modal</h3>
                    <p class="mb-4">This is a working example of the Modal component. It supports:</p>
                    <ul class="list-disc list-inside mb-4 text-sm">
                        <li>Backdrop click to close</li>
                        <li>Escape key to close</li>
                        <li>Smooth animations</li>
                        <li>Focus management</li>
                    </ul>
                    <div class="flex justify-end space-x-2">
                        <button id="close-demo-modal" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Close</button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        this.addShowcaseStyles();
    }

    renderButtonShowcase() {
        return `
            <div class="component-card">
                <div class="component-header">
                    <h3 class="component-title">Button</h3>
                    <span class="component-path">src/client/components/ui/button.js</span>
                </div>
                <div class="component-description">
                    Consistent button styling with multiple variants and states
                </div>
                <div class="component-demo">
                    <div class="demo-section">
                        <h4>Variants</h4>
                        <div class="flex flex-wrap gap-2 mb-4">
                            <button class="btn-primary">Primary</button>
                            <button class="btn-secondary">Secondary</button>
                            <button class="btn-success">Success</button>
                            <button class="btn-danger">Danger</button>
                        </div>
                    </div>
                    <div class="demo-section">
                        <h4>States</h4>
                        <div class="flex flex-wrap gap-2">
                            <button class="btn-primary" disabled>Disabled</button>
                            <button class="btn-secondary loading-btn">Loading...</button>
                        </div>
                    </div>
                </div>
                <div class="component-usage">
                    <strong>Usage:</strong> <code>this.button.create({ type: 'primary', text: 'Click me' })</code>
                </div>
            </div>
        `;
    }

    renderModalShowcase() {
        return `
            <div class="component-card">
                <div class="component-header">
                    <h3 class="component-title">Modal</h3>
                    <span class="component-path">src/client/components/ui/modal.js</span>
                </div>
                <div class="component-description">
                    Flexible modal dialogs with backdrop and keyboard support
                </div>
                <div class="component-demo">
                    <button id="demo-modal-btn" class="btn-primary">Open Demo Modal</button>
                </div>
                <div class="component-usage">
                    <strong>Features:</strong> Escape key, backdrop click, focus management, z-index stacking
                </div>
            </div>
        `;
    }

    renderNotificationShowcase() {
        return `
            <div class="component-card">
                <div class="component-header">
                    <h3 class="component-title">Notification</h3>
                    <span class="component-path">src/client/components/ui/notification.js</span>
                </div>
                <div class="component-description">
                    Toast notifications with different types and auto-dismiss
                </div>
                <div class="component-demo">
                    <div class="flex flex-wrap gap-2">
                        <button class="btn-primary" data-notification="success">Success</button>
                        <button class="btn-secondary" data-notification="info">Info</button>
                        <button class="btn-danger" data-notification="error">Error</button>
                        <button class="btn-secondary" data-notification="warning">Warning</button>
                    </div>
                </div>
                <div class="component-usage">
                    <strong>Usage:</strong> <code>this.notification.show({ type: 'success', message: 'Operation completed!' })</code>
                </div>
            </div>
        `;
    }

    renderLoadingSpinnerShowcase() {
        return `
            <div class="component-card">
                <div class="component-header">
                    <h3 class="component-title">Loading Spinner</h3>
                    <span class="component-path">src/client/components/ui/loading-spinner.js</span>
                </div>
                <div class="component-description">
                    Animated loading indicators for async operations
                </div>
                <div class="component-demo">
                    <div class="flex items-center gap-4">
                        <div class="loading-spinner-demo w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <span class="text-gray-600">Loading...</span>
                    </div>
                </div>
                <div class="component-usage">
                    <strong>Usage:</strong> <code>this.loadingSpinner.show('container-id')</code>
                </div>
            </div>
        `;
    }

    renderTooltipShowcase() {
        return `
            <div class="component-card">
                <div class="component-header">
                    <h3 class="component-title">Tooltip</h3>
                    <span class="component-path">src/client/components/ui/tooltip.js</span>
                </div>
                <div class="component-description">
                    Contextual help text that appears on hover
                </div>
                <div class="component-demo">
                    <button class="btn-secondary tooltip-demo" data-tooltip="This is a tooltip example!">
                        Hover for tooltip
                    </button>
                </div>
                <div class="component-usage">
                    <strong>Usage:</strong> <code>data-tooltip="Tooltip text"</code> or programmatic API
                </div>
            </div>
        `;
    }

    renderNavigationInfo() {
        const components = [
            { name: 'MainNav', path: 'main-nav.js', description: 'Primary application navigation' },
            { name: 'MobileMenu', path: 'mobile-menu.js', description: 'Responsive mobile navigation menu' },
            { name: 'UserMenu', path: 'user-menu.js', description: 'User authentication and profile menu' },
            { name: 'LanguageSwitcher', path: 'language-switcher.js', description: 'Multi-language support interface' }
        ];

        return components.map(comp => `
            <div class="component-card">
                <div class="component-header">
                    <h3 class="component-title">${comp.name}</h3>
                    <span class="component-path">src/client/components/navigation/${comp.path}</span>
                </div>
                <div class="component-description">${comp.description}</div>
                <div class="component-status">
                    <span class="status-badge active">Active in App</span>
                </div>
            </div>
        `).join('');
    }

    renderPortfolioInfo() {
        const components = [
            { name: 'PortfolioGrid', path: 'portfolio-grid.js', description: 'Grid layout for portfolio assets' },
            { name: 'AssetCard', path: 'asset-card.js', description: 'Individual asset display card' },
            { name: 'TradingModal', path: 'trading-modal.js', description: 'Asset trading interface modal' },
            { name: 'PerformanceChart', path: 'performance-chart.js', description: 'Portfolio performance visualization' },
            { name: 'QuickStats', path: 'quick-stats.js', description: 'Portfolio summary statistics' }
        ];

        return components.map(comp => `
            <div class="component-card">
                <div class="component-header">
                    <h3 class="component-title">${comp.name}</h3>
                    <span class="component-path">src/client/components/portfolio/${comp.path}</span>
                </div>
                <div class="component-description">${comp.description}</div>
                <div class="component-status">
                    <span class="status-badge active">Portfolio Page</span>
                </div>
            </div>
        `).join('');
    }

    renderEducationInfo() {
        const components = [
            { name: 'ContentRenderer', path: 'content-renderer.js', description: 'Educational content display and formatting' },
            { name: 'TableOfContents', path: 'table-of-contents.js', description: 'Education navigation and progress' },
            { name: 'ReadingProgress', path: 'reading-progress.js', description: 'Reading progress tracking' },
            { name: 'TopicList', path: 'topic-list.js', description: 'Educational topics listing' }
        ];

        return components.map(comp => `
            <div class="component-card">
                <div class="component-header">
                    <h3 class="component-title">${comp.name}</h3>
                    <span class="component-path">src/client/components/education/${comp.path}</span>
                </div>
                <div class="component-description">${comp.description}</div>
                <div class="component-status">
                    <span class="status-badge active">Education Page</span>
                </div>
            </div>
        `).join('');
    }

    renderAdminInfo() {
        const components = [
            { name: 'SuggestionList', path: 'suggestion-list.js', description: 'User suggestions management interface' },
            { name: 'UserManagement', path: 'user-management.js', description: 'User administration controls' },
            { name: 'SystemStats', path: 'system-stats.js', description: 'System statistics and metrics' },
            { name: 'AdminNav', path: 'admin-nav.js', description: 'Administrative navigation menu' }
        ];

        return components.map(comp => `
            <div class="component-card">
                <div class="component-header">
                    <h3 class="component-title">${comp.name}</h3>
                    <span class="component-path">src/client/components/admin/${comp.path}</span>
                </div>
                <div class="component-description">${comp.description}</div>
                <div class="component-status">
                    <span class="status-badge admin">Admin Only</span>
                </div>
            </div>
        `).join('');
    }

    addShowcaseStyles() {
        const styles = `
            <style>
                .components-showcase {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                }

                .showcase-nav {
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 1rem;
                }

                .nav-btn {
                    padding: 0.5rem 1rem;
                    background: #f3f4f6;
                    border: 1px solid #d1d5db;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .nav-btn:hover {
                    background: #e5e7eb;
                }

                .nav-btn.active {
                    background: #f97316;
                    color: white;
                    border-color: #f97316;
                }

                .component-section {
                    display: none;
                }

                .component-section.active {
                    display: block;
                }

                .section-title {
                    font-size: 2rem;
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                    color: #1f2937;
                }

                .section-description {
                    color: #6b7280;
                    margin-bottom: 2rem;
                    font-size: 1.1rem;
                }

                .component-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .component-card {
                    border: 1px solid #e5e7eb;
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                    background: white;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s;
                }

                .component-card:hover {
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    border-color: #f97316;
                }

                .component-header {
                    margin-bottom: 0.75rem;
                }

                .component-title {
                    font-size: 1.25rem;
                    font-weight: bold;
                    color: #1f2937;
                    margin-bottom: 0.25rem;
                }

                .component-path {
                    font-size: 0.875rem;
                    color: #6b7280;
                    font-family: monospace;
                    background: #f3f4f6;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                }

                .component-description {
                    color: #4b5563;
                    margin-bottom: 1rem;
                    line-height: 1.5;
                }

                .component-demo {
                    background: #f9fafb;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    margin-bottom: 1rem;
                    border: 1px solid #e5e7eb;
                }

                .demo-section {
                    margin-bottom: 1rem;
                }

                .demo-section:last-child {
                    margin-bottom: 0;
                }

                .demo-section h4 {
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: #374151;
                    font-size: 0.875rem;
                }

                .component-usage {
                    font-size: 0.875rem;
                    color: #6b7280;
                    line-height: 1.4;
                }

                .component-usage code {
                    background: #f3f4f6;
                    padding: 0.125rem 0.25rem;
                    border-radius: 0.25rem;
                    font-family: monospace;
                    font-size: 0.8rem;
                }

                .component-status {
                    margin-top: 0.75rem;
                }

                .status-badge {
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .status-badge.active {
                    background: #dcfce7;
                    color: #166534;
                }

                .status-badge.admin {
                    background: #fee2e2;
                    color: #991b1b;
                }

                /* Button styles for demo */
                .btn-primary {
                    background: #f97316;
                    color: white;
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #ea580c;
                }

                .btn-secondary {
                    background: #e5e7eb;
                    color: #374151;
                    padding: 0.5rem 1rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .btn-secondary:hover:not(:disabled) {
                    background: #d1d5db;
                }

                .btn-success {
                    background: #10b981;
                    color: white;
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .btn-success:hover:not(:disabled) {
                    background: #059669;
                }

                .btn-danger {
                    background: #ef4444;
                    color: white;
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .btn-danger:hover:not(:disabled) {
                    background: #dc2626;
                }

                button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed !important;
                }

                .loading-btn {
                    position: relative;
                    color: transparent !important;
                }

                .loading-btn::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 1rem;
                    height: 1rem;
                    border: 2px solid currentColor;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to {
                        transform: translate(-50%, -50%) rotate(360deg);
                    }
                }

                .tooltip-demo {
                    position: relative;
                }

                /* Responsive design */
                @media (max-width: 768px) {
                    .components-showcase {
                        padding: 1rem;
                    }

                    .component-grid {
                        grid-template-columns: 1fr;
                    }

                    .showcase-nav {
                        flex-direction: column;
                        gap: 0.5rem;
                    }

                    .nav-btn {
                        text-align: center;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    async setupEventListeners() {
        // Navigation between sections
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                this.switchSection(section);
            });
        });

        // Demo modal
        const demoModalBtn = document.getElementById('demo-modal-btn');
        const demoModal = document.getElementById('demo-modal');
        const closeDemoModal = document.getElementById('close-demo-modal');

        if (demoModalBtn && demoModal) {
            demoModalBtn.addEventListener('click', () => {
                demoModal.classList.remove('hidden');
            });

            const closeModal = () => {
                demoModal.classList.add('hidden');
            };

            if (closeDemoModal) {
                closeDemoModal.addEventListener('click', closeModal);
            }

            demoModal.addEventListener('click', (e) => {
                if (e.target === demoModal) {
                    closeModal();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !demoModal.classList.contains('hidden')) {
                    closeModal();
                }
            });
        }

        // Notification demos
        document.querySelectorAll('[data-notification]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.notification;
                this.showDemoNotification(type);
            });
        });

        // Tooltip demos
        this.setupTooltipDemos();
    }

    switchSection(sectionName) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update sections
        document.querySelectorAll('.component-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`section-${sectionName}`).classList.add('active');
    }

    showDemoNotification(type) {
        const messages = {
            success: 'Operation completed successfully!',
            info: 'Here is some helpful information.',
            error: 'An error occurred. Please try again.',
            warning: 'Warning: Please check your input.'
        };

        // Simple notification implementation for demo
        const notification = document.createElement('div');
        notification.className = `demo-notification ${type}`;
        notification.textContent = messages[type];

        const style = {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '9999',
            transform: 'translateX(400px)',
            transition: 'transform 0.3s ease',
            success: '#10b981',
            info: '#3b82f6',
            error: '#ef4444',
            warning: '#f59e0b'
        };

        Object.assign(notification.style, {
            position: style.position,
            top: style.top,
            right: style.right,
            padding: style.padding,
            borderRadius: style.borderRadius,
            color: style.color,
            fontWeight: style.fontWeight,
            zIndex: style.zIndex,
            transform: style.transform,
            transition: style.transition,
            backgroundColor: style[type]
        });

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    setupTooltipDemos() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');

        tooltipElements.forEach(element => {
            let tooltip = null;

            element.addEventListener('mouseenter', (e) => {
                const text = e.target.dataset.tooltip;
                if (!text) return;

                tooltip = document.createElement('div');
                tooltip.textContent = text;
                tooltip.className = 'demo-tooltip';

                Object.assign(tooltip.style, {
                    position: 'absolute',
                    background: '#1f2937',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    zIndex: '9999',
                    pointerEvents: 'none',
                    opacity: '0',
                    transition: 'opacity 0.2s'
                });

                document.body.appendChild(tooltip);

                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;

                setTimeout(() => {
                    tooltip.style.opacity = '1';
                }, 10);
            });

            element.addEventListener('mouseleave', () => {
                if (tooltip && tooltip.parentNode) {
                    tooltip.style.opacity = '0';
                    setTimeout(() => {
                        if (tooltip.parentNode) {
                            tooltip.parentNode.removeChild(tooltip);
                        }
                    }, 200);
                }
            });
        });
    }

    async initializeComponents() {
        // Initialize demo components
        try {
            await this.button.init();
            await this.modal.init();
            await this.notification.init();
            await this.loadingSpinner.init();
            await this.tooltip.init();
        } catch (error) {
            console.warn('Some demo components failed to initialize:', error);
        }
    }

    destroy() {
        if (!this.isInitialized) return;

        console.log('🧹 Destroying Components Showcase Page...');

        // Clean up components
        this.components.forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });

        this.components.clear();
        this.isInitialized = false;
    }
}