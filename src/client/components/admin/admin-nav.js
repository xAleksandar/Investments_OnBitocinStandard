class AdminNav {
    constructor(services = {}) {
        this.services = services;
        this.isInitialized = false;
        this.currentPage = 'dashboard';
        this.isMobileMenuOpen = false;
        this.adminPermissions = new Set();
        this.notificationCount = 0;

        this.navItems = {
            dashboard: {
                label: 'Dashboard',
                icon: 'icon-home',
                url: '#admin/dashboard',
                permissions: ['admin'],
                description: 'System overview and quick stats'
            },
            users: {
                label: 'User Management',
                icon: 'icon-users',
                url: '#admin/users',
                permissions: ['admin', 'moderator'],
                description: 'Manage user accounts and roles'
            },
            suggestions: {
                label: 'Suggestions',
                icon: 'icon-message-circle',
                url: '#admin/suggestions',
                permissions: ['admin', 'moderator'],
                description: 'Review user feedback and suggestions',
                badge: 'notificationCount'
            },
            analytics: {
                label: 'Analytics',
                icon: 'icon-bar-chart',
                url: '#admin/analytics',
                permissions: ['admin'],
                description: 'Detailed system analytics and reports'
            },
            content: {
                label: 'Content Management',
                icon: 'icon-file-text',
                url: '#admin/content',
                permissions: ['admin', 'moderator'],
                description: 'Manage educational content and resources'
            },
            system: {
                label: 'System Health',
                icon: 'icon-activity',
                url: '#admin/system',
                permissions: ['admin'],
                description: 'Monitor system performance and health'
            },
            settings: {
                label: 'Settings',
                icon: 'icon-settings',
                url: '#admin/settings',
                permissions: ['admin'],
                description: 'System configuration and preferences'
            },
            logs: {
                label: 'Audit Logs',
                icon: 'icon-file-text',
                url: '#admin/logs',
                permissions: ['admin'],
                description: 'View system and user activity logs'
            }
        };

        this.quickActions = {
            newUser: {
                label: 'Add User',
                icon: 'icon-user-plus',
                action: 'createUser',
                permissions: ['admin']
            },
            backup: {
                label: 'Create Backup',
                icon: 'icon-database',
                action: 'createBackup',
                permissions: ['admin']
            },
            broadcast: {
                label: 'Send Notification',
                icon: 'icon-bell',
                action: 'sendBroadcast',
                permissions: ['admin', 'moderator']
            },
            export: {
                label: 'Export Data',
                icon: 'icon-download',
                action: 'exportData',
                permissions: ['admin']
            }
        };
    }

    async init() {
        if (this.isInitialized) return;

        try {
            await this.loadAdminPermissions();
            this.createAdminNavigation();
            this.attachEventListeners();
            this.updateNavigationState();
            this.startNotificationPolling();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize admin navigation:', error);
            this.services.notificationService?.show('Failed to initialize admin navigation', 'error');
        }
    }

    async loadAdminPermissions() {
        try {
            const userProfile = await this.services.authService?.getCurrentUser();
            if (userProfile && userProfile.role) {
                this.adminPermissions.add(userProfile.role);

                if (userProfile.role === 'admin') {
                    this.adminPermissions.add('moderator');
                }
            }
        } catch (error) {
            console.error('Failed to load admin permissions:', error);
        }
    }

    createAdminNavigation() {
        const container = document.getElementById('admin-nav-container');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-nav-wrapper">
                <div class="admin-nav-header">
                    <div class="admin-brand">
                        <div class="brand-icon">
                            <i class="icon-shield"></i>
                        </div>
                        <div class="brand-info">
                            <h3 class="brand-title">Admin Panel</h3>
                            <p class="brand-subtitle">Measured in Bitcoin</p>
                        </div>
                    </div>

                    <div class="mobile-menu-toggle">
                        <button type="button" class="mobile-toggle-btn" data-action="toggle-mobile-menu">
                            <i class="icon-menu"></i>
                        </button>
                    </div>
                </div>

                <div class="admin-nav-content">
                    <div class="admin-nav-section">
                        <h4 class="nav-section-title">Navigation</h4>
                        <ul class="admin-nav-list">
                            ${this.renderNavItems()}
                        </ul>
                    </div>

                    <div class="admin-nav-section">
                        <h4 class="nav-section-title">Quick Actions</h4>
                        <div class="quick-actions-grid">
                            ${this.renderQuickActions()}
                        </div>
                    </div>

                    <div class="admin-nav-section">
                        <h4 class="nav-section-title">System Status</h4>
                        <div class="system-status-overview">
                            <div class="status-item">
                                <div class="status-indicator">
                                    <div class="status-dot healthy"></div>
                                </div>
                                <div class="status-info">
                                    <div class="status-label">System Health</div>
                                    <div class="status-value">Healthy</div>
                                </div>
                            </div>

                            <div class="status-item">
                                <div class="status-indicator">
                                    <div class="status-dot active"></div>
                                </div>
                                <div class="status-info">
                                    <div class="status-label">Active Users</div>
                                    <div class="status-value loading">--</div>
                                </div>
                            </div>

                            <div class="status-item">
                                <div class="status-indicator">
                                    <div class="status-dot warning"></div>
                                </div>
                                <div class="status-info">
                                    <div class="status-label">Pending Reviews</div>
                                    <div class="status-value pending-count loading">--</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="admin-nav-footer">
                    <div class="admin-user-info">
                        <div class="admin-avatar">
                            <i class="icon-user"></i>
                        </div>
                        <div class="admin-details">
                            <div class="admin-name">Admin User</div>
                            <div class="admin-role">Administrator</div>
                        </div>
                    </div>

                    <div class="admin-nav-actions">
                        <button type="button" class="btn btn-sm btn-outline" data-action="view-main-site">
                            <i class="icon-external-link"></i>
                            View Site
                        </button>
                        <button type="button" class="btn btn-sm btn-outline" data-action="logout">
                            <i class="icon-log-out"></i>
                            Logout
                        </button>
                    </div>
                </div>

                <div class="mobile-menu-overlay" style="display: none;"></div>
            </div>
        `;

        this.createNavigationModals();
    }

    renderNavItems() {
        return Object.entries(this.navItems)
            .filter(([key, item]) => this.hasPermission(item.permissions))
            .map(([key, item]) => {
                const badgeCount = item.badge ? this[item.badge] || 0 : 0;
                const hasBadge = badgeCount > 0;

                return `
                    <li class="nav-item ${key === this.currentPage ? 'active' : ''}" data-page="${key}">
                        <a href="${item.url}" class="nav-link" data-action="navigate" data-page="${key}">
                            <div class="nav-icon">
                                <i class="${item.icon}"></i>
                            </div>
                            <div class="nav-content">
                                <div class="nav-label">${item.label}</div>
                                <div class="nav-description">${item.description}</div>
                            </div>
                            ${hasBadge ? `
                                <div class="nav-badge">
                                    <span class="badge-count">${badgeCount > 99 ? '99+' : badgeCount}</span>
                                </div>
                            ` : ''}
                        </a>
                    </li>
                `;
            }).join('');
    }

    renderQuickActions() {
        return Object.entries(this.quickActions)
            .filter(([key, action]) => this.hasPermission(action.permissions))
            .map(([key, action]) => `
                <button type="button" class="quick-action-btn" data-action="${action.action}" title="${action.label}">
                    <div class="action-icon">
                        <i class="${action.icon}"></i>
                    </div>
                    <div class="action-label">${action.label}</div>
                </button>
            `).join('');
    }

    createNavigationModals() {
        const modalsHTML = `
            <div id="admin-broadcast-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Send Broadcast Notification</h3>
                        <button type="button" class="modal-close" data-action="close-modal">
                            <i class="icon-x"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <div class="form-group">
                            <label for="broadcast-type">Notification Type:</label>
                            <select id="broadcast-type" class="form-control">
                                <option value="info">Information</option>
                                <option value="warning">Warning</option>
                                <option value="success">Success</option>
                                <option value="announcement">Announcement</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="broadcast-title">Title:</label>
                            <input type="text" id="broadcast-title" class="form-control" placeholder="Notification title">
                        </div>

                        <div class="form-group">
                            <label for="broadcast-message">Message:</label>
                            <textarea id="broadcast-message" class="form-control" rows="4"
                                      placeholder="Notification message content"></textarea>
                        </div>

                        <div class="form-group">
                            <label for="broadcast-audience">Send To:</label>
                            <select id="broadcast-audience" class="form-control">
                                <option value="all">All Users</option>
                                <option value="active">Active Users Only</option>
                                <option value="admins">Administrators Only</option>
                                <option value="premium">Premium Users Only</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="broadcast-persistent">
                                Show as persistent notification
                            </label>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" data-action="close-modal">Cancel</button>
                        <button type="button" class="btn btn-primary" data-action="send-broadcast">
                            Send Notification
                        </button>
                    </div>
                </div>
            </div>

            <div id="admin-backup-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Create System Backup</h3>
                        <button type="button" class="modal-close" data-action="close-modal">
                            <i class="icon-x"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <div class="backup-options">
                            <div class="form-group">
                                <label>Backup Type:</label>
                                <div class="radio-group">
                                    <label><input type="radio" name="backup-type" value="full" checked> Full Backup</label>
                                    <label><input type="radio" name="backup-type" value="database"> Database Only</label>
                                    <label><input type="radio" name="backup-type" value="files"> Files Only</label>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="compress-backup" checked>
                                    Compress backup file
                                </label>
                            </div>

                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="verify-backup" checked>
                                    Verify backup integrity
                                </label>
                            </div>

                            <div class="backup-info">
                                <div class="info-item">
                                    <label>Estimated Size:</label>
                                    <span class="backup-size">~245 MB</span>
                                </div>
                                <div class="info-item">
                                    <label>Estimated Time:</label>
                                    <span class="backup-time">~3-5 minutes</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" data-action="close-modal">Cancel</button>
                        <button type="button" class="btn btn-primary" data-action="create-backup">
                            Create Backup
                        </button>
                    </div>
                </div>
            </div>

            <div id="admin-export-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Export System Data</h3>
                        <button type="button" class="modal-close" data-action="close-modal">
                            <i class="icon-x"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <div class="form-group">
                            <label>Data to Export:</label>
                            <div class="checkbox-group">
                                <label><input type="checkbox" value="users" checked> User Data</label>
                                <label><input type="checkbox" value="portfolios" checked> Portfolio Data</label>
                                <label><input type="checkbox" value="trades" checked> Trading History</label>
                                <label><input type="checkbox" value="suggestions" checked> User Suggestions</label>
                                <label><input type="checkbox" value="analytics" checked> Analytics Data</label>
                                <label><input type="checkbox" value="system" checked> System Logs</label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="export-format">Export Format:</label>
                            <select id="export-format" class="form-control">
                                <option value="csv">CSV (Comma Separated)</option>
                                <option value="json">JSON (JavaScript Object)</option>
                                <option value="xlsx">Excel (Spreadsheet)</option>
                                <option value="xml">XML (Markup)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="export-date-range">Date Range:</label>
                            <select id="export-date-range" class="form-control">
                                <option value="all">All Time</option>
                                <option value="year">Last Year</option>
                                <option value="quarter">Last Quarter</option>
                                <option value="month">Last Month</option>
                                <option value="week">Last Week</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" data-action="close-modal">Cancel</button>
                        <button type="button" class="btn btn-primary" data-action="start-export">
                            Start Export
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalsHTML);
    }

    attachEventListeners() {
        const container = document.getElementById('admin-nav-container');
        if (!container) return;

        container.addEventListener('click', this.handleClick.bind(this));

        document.addEventListener('click', this.handleModalClick.bind(this));

        window.addEventListener('hashchange', this.handleHashChange.bind(this));
        window.addEventListener('beforeunload', this.cleanup.bind(this));

        document.addEventListener('adminNavUpdate', this.handleNavUpdate.bind(this));
    }

    handleClick(event) {
        const action = event.target.dataset.action;
        const page = event.target.dataset.page;

        if (action) {
            event.preventDefault();
            this.executeAction(action, event.target);
        } else if (page) {
            event.preventDefault();
            this.navigateToPage(page);
        }
    }

    handleModalClick(event) {
        if (event.target.dataset.action === 'close-modal') {
            this.closeModal();
        }
    }

    handleHashChange() {
        const hash = window.location.hash;
        const adminMatch = hash.match(/^#admin\/(.+)$/);

        if (adminMatch) {
            const page = adminMatch[1];
            this.setCurrentPage(page);
        }
    }

    handleNavUpdate(event) {
        if (event.detail) {
            if (event.detail.notificationCount !== undefined) {
                this.notificationCount = event.detail.notificationCount;
                this.updateNotificationBadge();
            }

            if (event.detail.systemStatus) {
                this.updateSystemStatus(event.detail.systemStatus);
            }
        }
    }

    async executeAction(action, element) {
        switch (action) {
            case 'navigate':
                const page = element.dataset.page;
                if (page) {
                    this.navigateToPage(page);
                }
                break;
            case 'toggle-mobile-menu':
                this.toggleMobileMenu();
                break;
            case 'view-main-site':
                window.open('/', '_blank');
                break;
            case 'logout':
                await this.handleLogout();
                break;
            case 'createUser':
                this.dispatchAdminAction('createUser');
                break;
            case 'createBackup':
                this.showBackupModal();
                break;
            case 'sendBroadcast':
                this.showBroadcastModal();
                break;
            case 'exportData':
                this.showExportModal();
                break;
            case 'send-broadcast':
                await this.sendBroadcast();
                break;
            case 'create-backup':
                await this.createBackup();
                break;
            case 'start-export':
                await this.startExport();
                break;
        }
    }

    navigateToPage(page) {
        if (!this.navItems[page] || !this.hasPermission(this.navItems[page].permissions)) {
            this.services.notificationService?.show('Access denied', 'error');
            return;
        }

        this.setCurrentPage(page);
        window.location.hash = this.navItems[page].url;

        this.dispatchNavigationEvent(page);

        if (this.isMobileMenuOpen) {
            this.toggleMobileMenu();
        }
    }

    setCurrentPage(page) {
        this.currentPage = page;
        this.updateActiveNavItem();
    }

    updateActiveNavItem() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === this.currentPage);
        });
    }

    toggleMobileMenu() {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;

        const wrapper = document.querySelector('.admin-nav-wrapper');
        const overlay = document.querySelector('.mobile-menu-overlay');
        const toggleBtn = document.querySelector('.mobile-toggle-btn');

        if (wrapper) {
            wrapper.classList.toggle('mobile-open', this.isMobileMenuOpen);
        }

        if (overlay) {
            overlay.style.display = this.isMobileMenuOpen ? 'block' : 'none';
            overlay.addEventListener('click', () => this.toggleMobileMenu());
        }

        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = this.isMobileMenuOpen ? 'icon-x' : 'icon-menu';
            }
        }
    }

    updateNotificationBadge() {
        const suggestionItem = document.querySelector('[data-page="suggestions"]');
        if (!suggestionItem) return;

        const existingBadge = suggestionItem.querySelector('.nav-badge');

        if (this.notificationCount > 0) {
            const badgeCount = this.notificationCount > 99 ? '99+' : this.notificationCount;

            if (existingBadge) {
                existingBadge.querySelector('.badge-count').textContent = badgeCount;
            } else {
                const navContent = suggestionItem.querySelector('.nav-content');
                navContent.insertAdjacentHTML('afterend', `
                    <div class="nav-badge">
                        <span class="badge-count">${badgeCount}</span>
                    </div>
                `);
            }
        } else if (existingBadge) {
            existingBadge.remove();
        }
    }

    updateSystemStatus(statusData) {
        const activeUsersValue = document.querySelector('.status-value:not(.pending-count)');
        const pendingCountValue = document.querySelector('.pending-count');

        if (activeUsersValue && statusData.activeUsers) {
            activeUsersValue.textContent = statusData.activeUsers;
            activeUsersValue.classList.remove('loading');
        }

        if (pendingCountValue && statusData.pendingReviews !== undefined) {
            pendingCountValue.textContent = statusData.pendingReviews;
            pendingCountValue.classList.remove('loading');
        }

        if (statusData.systemHealth) {
            const healthDot = document.querySelector('.status-dot.healthy');
            const healthValue = document.querySelector('.status-value');

            if (healthDot && healthValue) {
                healthDot.className = `status-dot ${statusData.systemHealth.status}`;
                healthValue.textContent = statusData.systemHealth.label;
            }
        }
    }

    async handleLogout() {
        try {
            await this.services.authService?.logout();
            window.location.href = '/';
        } catch (error) {
            console.error('Failed to logout:', error);
            this.services.notificationService?.show('Failed to logout', 'error');
        }
    }

    showBroadcastModal() {
        const modal = document.getElementById('admin-broadcast-modal');
        if (modal) {
            this.services.modalService?.show(modal);
        }
    }

    showBackupModal() {
        const modal = document.getElementById('admin-backup-modal');
        if (modal) {
            this.services.modalService?.show(modal);
        }
    }

    showExportModal() {
        const modal = document.getElementById('admin-export-modal');
        if (modal) {
            this.services.modalService?.show(modal);
        }
    }

    async sendBroadcast() {
        const type = document.getElementById('broadcast-type').value;
        const title = document.getElementById('broadcast-title').value;
        const message = document.getElementById('broadcast-message').value;
        const audience = document.getElementById('broadcast-audience').value;
        const persistent = document.getElementById('broadcast-persistent').checked;

        if (!title || !message) {
            this.services.notificationService?.show('Please fill in all required fields', 'warning');
            return;
        }

        try {
            await this.services.adminService?.sendBroadcast({
                type,
                title,
                message,
                audience,
                persistent
            });

            this.closeModal();
            this.services.notificationService?.show('Broadcast notification sent successfully', 'success');
        } catch (error) {
            console.error('Failed to send broadcast:', error);
            this.services.notificationService?.show('Failed to send broadcast notification', 'error');
        }
    }

    async createBackup() {
        const backupType = document.querySelector('input[name="backup-type"]:checked').value;
        const compress = document.getElementById('compress-backup').checked;
        const verify = document.getElementById('verify-backup').checked;

        try {
            this.services.notificationService?.show('Creating backup... This may take a few minutes', 'info');

            await this.services.adminService?.createBackup({
                type: backupType,
                compress,
                verify
            });

            this.closeModal();
            this.services.notificationService?.show('Backup created successfully', 'success');
        } catch (error) {
            console.error('Failed to create backup:', error);
            this.services.notificationService?.show('Failed to create backup', 'error');
        }
    }

    async startExport() {
        const dataTypes = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(cb => cb.value);
        const format = document.getElementById('export-format').value;
        const dateRange = document.getElementById('export-date-range').value;

        if (dataTypes.length === 0) {
            this.services.notificationService?.show('Please select at least one data type to export', 'warning');
            return;
        }

        try {
            this.services.notificationService?.show('Starting data export...', 'info');

            await this.services.adminService?.exportData({
                dataTypes,
                format,
                dateRange
            });

            this.closeModal();
            this.services.notificationService?.show('Data export initiated. You will receive a download link shortly', 'success');
        } catch (error) {
            console.error('Failed to start export:', error);
            this.services.notificationService?.show('Failed to start data export', 'error');
        }
    }

    dispatchNavigationEvent(page) {
        const event = new CustomEvent('adminNavigate', {
            detail: { page, navItems: this.navItems }
        });
        document.dispatchEvent(event);
    }

    dispatchAdminAction(action, data = {}) {
        const event = new CustomEvent('adminAction', {
            detail: { action, data }
        });
        document.dispatchEvent(event);
    }

    updateNavigationState() {
        const hash = window.location.hash;
        const adminMatch = hash.match(/^#admin\/(.+)$/);

        if (adminMatch) {
            const page = adminMatch[1];
            if (this.navItems[page] && this.hasPermission(this.navItems[page].permissions)) {
                this.setCurrentPage(page);
            }
        }
    }

    hasPermission(permissions) {
        if (!permissions || permissions.length === 0) return true;
        return permissions.some(permission => this.adminPermissions.has(permission));
    }

    async startNotificationPolling() {
        try {
            const stats = await this.services.adminService?.getNotificationCounts();
            if (stats) {
                this.notificationCount = stats.suggestions || 0;
                this.updateNotificationBadge();
                this.updateSystemStatus(stats);
            }
        } catch (error) {
            console.error('Failed to load notification counts:', error);
        }

        setInterval(async () => {
            try {
                const stats = await this.services.adminService?.getNotificationCounts();
                if (stats) {
                    this.notificationCount = stats.suggestions || 0;
                    this.updateNotificationBadge();
                    this.updateSystemStatus(stats);
                }
            } catch (error) {
                console.error('Failed to update notification counts:', error);
            }
        }, 30000);
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            this.services.modalService?.hide(modal);
        });
    }

    cleanup() {
        this.isInitialized = false;
        this.adminPermissions.clear();
    }

    destroy() {
        this.cleanup();

        const container = document.getElementById('admin-nav-container');
        if (container) {
            container.removeEventListener('click', this.handleClick.bind(this));
        }

        document.removeEventListener('click', this.handleModalClick.bind(this));
        window.removeEventListener('hashchange', this.handleHashChange.bind(this));
        window.removeEventListener('beforeunload', this.cleanup.bind(this));
        document.removeEventListener('adminNavUpdate', this.handleNavUpdate.bind(this));

        const modals = ['admin-broadcast-modal', 'admin-backup-modal', 'admin-export-modal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.remove();
            }
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminNav;
} else if (typeof window !== 'undefined') {
    window.AdminNav = AdminNav;
}