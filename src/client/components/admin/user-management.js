class UserManagement {
    constructor(services = {}) {
        this.services = services;
        this.userLists = new Map();
        this.selectedUsers = new Set();
        this.isInitialized = false;
        this.refreshInterval = null;
        this.searchTimeout = null;
        this.currentExportType = null;

        this.defaultFilters = {
            status: 'all',
            role: 'all',
            registrationDate: 'all',
            lastActive: 'all',
            hasPortfolio: 'all'
        };

        this.defaultSorting = {
            field: 'lastActive',
            direction: 'desc'
        };

        this.userStatuses = {
            active: { label: 'Active', color: '#10b981' },
            inactive: { label: 'Inactive', color: '#6b7280' },
            suspended: { label: 'Suspended', color: '#ef4444' },
            pending: { label: 'Pending', color: '#f59e0b' }
        };

        this.userRoles = {
            user: { label: 'User', permissions: ['portfolio'] },
            premium: { label: 'Premium', permissions: ['portfolio', 'advanced_analytics'] },
            admin: { label: 'Admin', permissions: ['all'] },
            moderator: { label: 'Moderator', permissions: ['user_management', 'content_moderation'] }
        };
    }

    async init() {
        if (this.isInitialized) return;

        try {
            this.createUserManagementInterface();
            this.attachEventListeners();
            this.startAutoRefresh();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize user management:', error);
            this.services.notificationService?.show('Failed to initialize user management', 'error');
        }
    }

    createUserManagementInterface() {
        const container = document.getElementById('user-management-container');
        if (!container) return;

        container.innerHTML = `
            <div class="user-management-wrapper">
                <div class="user-management-header">
                    <div class="header-top">
                        <h2 class="section-title">User Management</h2>
                        <div class="header-actions">
                            <button type="button" class="btn btn-outline refresh-btn" data-action="refresh">
                                <i class="icon-refresh"></i>
                                Refresh
                            </button>
                            <button type="button" class="btn btn-primary new-user-btn" data-action="create-user">
                                <i class="icon-plus"></i>
                                Add User
                            </button>
                        </div>
                    </div>

                    <div class="management-controls">
                        <div class="search-section">
                            <div class="search-box">
                                <i class="icon-search"></i>
                                <input type="text"
                                       placeholder="Search users by name, email, or ID..."
                                       class="search-input"
                                       data-action="search">
                            </div>
                        </div>

                        <div class="filter-section">
                            <div class="filter-group">
                                <label for="status-filter">Status:</label>
                                <select id="status-filter" class="filter-select" data-filter="status">
                                    <option value="all">All Statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            <div class="filter-group">
                                <label for="role-filter">Role:</label>
                                <select id="role-filter" class="filter-select" data-filter="role">
                                    <option value="all">All Roles</option>
                                    <option value="user">User</option>
                                    <option value="premium">Premium</option>
                                    <option value="admin">Admin</option>
                                    <option value="moderator">Moderator</option>
                                </select>
                            </div>

                            <div class="filter-group">
                                <label for="registration-filter">Registration:</label>
                                <select id="registration-filter" class="filter-select" data-filter="registrationDate">
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                    <option value="quarter">This Quarter</option>
                                </select>
                            </div>

                            <div class="filter-group">
                                <label for="activity-filter">Last Active:</label>
                                <select id="activity-filter" class="filter-select" data-filter="lastActive">
                                    <option value="all">Any Time</option>
                                    <option value="hour">Last Hour</option>
                                    <option value="day">Last Day</option>
                                    <option value="week">Last Week</option>
                                    <option value="month">Last Month</option>
                                </select>
                            </div>
                        </div>

                        <div class="bulk-actions">
                            <div class="selection-info">
                                <span class="selected-count">0 selected</span>
                                <button type="button" class="btn btn-link select-all-btn" data-action="select-all">
                                    Select All
                                </button>
                                <button type="button" class="btn btn-link clear-selection-btn" data-action="clear-selection" style="display: none;">
                                    Clear Selection
                                </button>
                            </div>

                            <div class="bulk-action-buttons" style="display: none;">
                                <button type="button" class="btn btn-outline" data-bulk-action="activate">
                                    <i class="icon-check"></i>
                                    Activate
                                </button>
                                <button type="button" class="btn btn-outline" data-bulk-action="deactivate">
                                    <i class="icon-x"></i>
                                    Deactivate
                                </button>
                                <button type="button" class="btn btn-outline" data-bulk-action="suspend">
                                    <i class="icon-lock"></i>
                                    Suspend
                                </button>
                                <button type="button" class="btn btn-outline" data-bulk-action="change-role">
                                    <i class="icon-users"></i>
                                    Change Role
                                </button>
                                <button type="button" class="btn btn-outline" data-bulk-action="export">
                                    <i class="icon-download"></i>
                                    Export
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="user-list-container">
                    <div class="user-list-header">
                        <div class="sort-controls">
                            <span>Sort by:</span>
                            <select class="sort-select" data-sort="field">
                                <option value="lastActive">Last Active</option>
                                <option value="name">Name</option>
                                <option value="email">Email</option>
                                <option value="registrationDate">Registration Date</option>
                                <option value="role">Role</option>
                                <option value="portfolioValue">Portfolio Value</option>
                            </select>
                            <button type="button" class="btn btn-sm sort-direction-btn" data-sort="direction" data-direction="desc">
                                <i class="icon-arrow-down"></i>
                            </button>
                        </div>

                        <div class="view-controls">
                            <button type="button" class="btn btn-sm view-btn active" data-view="table">
                                <i class="icon-list"></i>
                                Table
                            </button>
                            <button type="button" class="btn btn-sm view-btn" data-view="cards">
                                <i class="icon-grid"></i>
                                Cards
                            </button>
                        </div>
                    </div>

                    <div class="user-list-content">
                        <div class="user-table-view active">
                            <table class="user-table">
                                <thead>
                                    <tr>
                                        <th class="checkbox-col">
                                            <input type="checkbox" class="select-all-checkbox">
                                        </th>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Portfolio Value</th>
                                        <th>Last Active</th>
                                        <th>Registration</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="user-table-body">
                                </tbody>
                            </table>
                        </div>

                        <div class="user-cards-view">
                            <div class="user-cards-grid">
                            </div>
                        </div>
                    </div>

                    <div class="user-list-footer">
                        <div class="pagination-info">
                            <span class="results-count">0 users</span>
                        </div>

                        <div class="pagination-controls">
                            <button type="button" class="btn btn-sm prev-page-btn" data-action="prev-page" disabled>
                                <i class="icon-chevron-left"></i>
                                Previous
                            </button>
                            <span class="page-info">Page 1 of 1</span>
                            <button type="button" class="btn btn-sm next-page-btn" data-action="next-page" disabled>
                                Next
                                <i class="icon-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="loading-state" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>Loading users...</p>
                </div>

                <div class="error-state" style="display: none;">
                    <div class="error-icon">⚠️</div>
                    <h3>Failed to Load Users</h3>
                    <p>There was an error loading the user data. Please try refreshing the page.</p>
                    <button type="button" class="btn btn-primary retry-btn" data-action="retry">
                        Try Again
                    </button>
                </div>

                <div class="empty-state" style="display: none;">
                    <div class="empty-icon">👥</div>
                    <h3>No Users Found</h3>
                    <p>No users match your current filters. Try adjusting your search criteria.</p>
                </div>
            </div>
        `;

        this.createUserDetailModal();
        this.createBulkActionModals();
    }

    createUserDetailModal() {
        const modalHTML = `
            <div id="user-detail-modal" class="modal" style="display: none;">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3 class="modal-title">User Details</h3>
                        <button type="button" class="modal-close" data-action="close-modal">
                            <i class="icon-x"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <div class="user-detail-tabs">
                            <button type="button" class="tab-btn active" data-tab="overview">Overview</button>
                            <button type="button" class="tab-btn" data-tab="portfolio">Portfolio</button>
                            <button type="button" class="tab-btn" data-tab="activity">Activity</button>
                            <button type="button" class="tab-btn" data-tab="settings">Settings</button>
                        </div>

                        <div class="user-detail-content">
                            <div class="tab-panel active" data-panel="overview">
                                <div class="user-info-grid">
                                    <div class="info-section">
                                        <h4>Basic Information</h4>
                                        <div class="info-item">
                                            <label>Name:</label>
                                            <span class="user-name-display"></span>
                                        </div>
                                        <div class="info-item">
                                            <label>Email:</label>
                                            <span class="user-email-display"></span>
                                        </div>
                                        <div class="info-item">
                                            <label>User ID:</label>
                                            <span class="user-id-display"></span>
                                        </div>
                                        <div class="info-item">
                                            <label>Registration Date:</label>
                                            <span class="user-registration-display"></span>
                                        </div>
                                    </div>

                                    <div class="info-section">
                                        <h4>Account Status</h4>
                                        <div class="info-item">
                                            <label>Status:</label>
                                            <span class="user-status-display"></span>
                                        </div>
                                        <div class="info-item">
                                            <label>Role:</label>
                                            <span class="user-role-display"></span>
                                        </div>
                                        <div class="info-item">
                                            <label>Last Active:</label>
                                            <span class="user-last-active-display"></span>
                                        </div>
                                        <div class="info-item">
                                            <label>Total Sessions:</label>
                                            <span class="user-sessions-display"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="tab-panel" data-panel="portfolio">
                                <div class="portfolio-summary">
                                    <div class="portfolio-stats">
                                        <div class="stat-item">
                                            <label>Total Value (BTC):</label>
                                            <span class="portfolio-btc-value"></span>
                                        </div>
                                        <div class="stat-item">
                                            <label>Total Value (USD):</label>
                                            <span class="portfolio-usd-value"></span>
                                        </div>
                                        <div class="stat-item">
                                            <label>Assets Count:</label>
                                            <span class="portfolio-assets-count"></span>
                                        </div>
                                        <div class="stat-item">
                                            <label>Last Trade:</label>
                                            <span class="portfolio-last-trade"></span>
                                        </div>
                                    </div>
                                    <div class="portfolio-assets-list">
                                    </div>
                                </div>
                            </div>

                            <div class="tab-panel" data-panel="activity">
                                <div class="activity-timeline">
                                </div>
                            </div>

                            <div class="tab-panel" data-panel="settings">
                                <div class="user-settings-form">
                                    <div class="form-group">
                                        <label for="user-status-select">Status:</label>
                                        <select id="user-status-select" class="form-control">
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="suspended">Suspended</option>
                                            <option value="pending">Pending</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="user-role-select">Role:</label>
                                        <select id="user-role-select" class="form-control">
                                            <option value="user">User</option>
                                            <option value="premium">Premium</option>
                                            <option value="admin">Admin</option>
                                            <option value="moderator">Moderator</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label>
                                            <input type="checkbox" id="user-email-verified">
                                            Email Verified
                                        </label>
                                    </div>

                                    <div class="form-group">
                                        <label>
                                            <input type="checkbox" id="user-notifications-enabled">
                                            Notifications Enabled
                                        </label>
                                    </div>

                                    <div class="form-actions">
                                        <button type="button" class="btn btn-primary" data-action="save-user-settings">
                                            Save Changes
                                        </button>
                                        <button type="button" class="btn btn-outline" data-action="reset-user-password">
                                            Reset Password
                                        </button>
                                        <button type="button" class="btn btn-danger" data-action="delete-user">
                                            Delete User
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    createBulkActionModals() {
        const bulkModalsHTML = `
            <div id="bulk-role-change-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Change User Roles</h3>
                        <button type="button" class="modal-close" data-action="close-modal">
                            <i class="icon-x"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <p>Change the role for <span class="selected-users-count">0</span> selected users:</p>

                        <div class="form-group">
                            <label for="bulk-role-select">New Role:</label>
                            <select id="bulk-role-select" class="form-control">
                                <option value="user">User</option>
                                <option value="premium">Premium</option>
                                <option value="admin">Admin</option>
                                <option value="moderator">Moderator</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="bulk-notify-users">
                                Notify users of role change
                            </label>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" data-action="close-modal">Cancel</button>
                        <button type="button" class="btn btn-primary" data-action="confirm-bulk-role-change">
                            Change Roles
                        </button>
                    </div>
                </div>
            </div>

            <div id="bulk-export-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Export Users</h3>
                        <button type="button" class="modal-close" data-action="close-modal">
                            <i class="icon-x"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <p>Export <span class="selected-users-count">0</span> selected users:</p>

                        <div class="form-group">
                            <label for="export-format-select">Export Format:</label>
                            <select id="export-format-select" class="form-control">
                                <option value="csv">CSV (Spreadsheet)</option>
                                <option value="json">JSON (Developer)</option>
                                <option value="pdf">PDF (Report)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Include Fields:</label>
                            <div class="checkbox-group">
                                <label><input type="checkbox" value="basic" checked disabled> Basic Info</label>
                                <label><input type="checkbox" value="portfolio" checked> Portfolio Data</label>
                                <label><input type="checkbox" value="activity" checked> Activity History</label>
                                <label><input type="checkbox" value="settings"> Account Settings</label>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" data-action="close-modal">Cancel</button>
                        <button type="button" class="btn btn-primary" data-action="confirm-bulk-export">
                            Export Users
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', bulkModalsHTML);
    }

    attachEventListeners() {
        const container = document.getElementById('user-management-container');
        if (!container) return;

        container.addEventListener('click', this.handleClick.bind(this));
        container.addEventListener('change', this.handleChange.bind(this));
        container.addEventListener('input', this.handleInput.bind(this));

        document.addEventListener('click', this.handleModalClick.bind(this));

        window.addEventListener('beforeunload', this.cleanup.bind(this));
    }

    handleClick(event) {
        const action = event.target.dataset.action;
        const bulkAction = event.target.dataset.bulkAction;

        if (action) {
            event.preventDefault();
            this.executeAction(action, event.target);
        } else if (bulkAction) {
            event.preventDefault();
            this.executeBulkAction(bulkAction, event.target);
        } else if (event.target.classList.contains('user-checkbox')) {
            this.handleUserSelection(event.target);
        } else if (event.target.classList.contains('user-row') || event.target.closest('.user-row')) {
            const userRow = event.target.classList.contains('user-row') ? event.target : event.target.closest('.user-row');
            const userId = userRow.dataset.userId;
            if (userId) {
                this.showUserDetail(userId);
            }
        }
    }

    handleChange(event) {
        if (event.target.classList.contains('filter-select')) {
            this.applyFilters();
        } else if (event.target.classList.contains('sort-select')) {
            this.applySorting();
        } else if (event.target.classList.contains('select-all-checkbox')) {
            this.toggleSelectAll(event.target.checked);
        }
    }

    handleInput(event) {
        if (event.target.classList.contains('search-input')) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.performSearch(event.target.value);
            }, 300);
        }
    }

    handleModalClick(event) {
        if (event.target.dataset.action === 'close-modal') {
            this.closeModal();
        } else if (event.target.dataset.tab) {
            this.switchTab(event.target.dataset.tab);
        }
    }

    async executeAction(action, element) {
        switch (action) {
            case 'refresh':
                await this.refreshUsers();
                break;
            case 'create-user':
                this.showCreateUserForm();
                break;
            case 'search':
                this.performSearch(element.value);
                break;
            case 'select-all':
                this.selectAllVisible();
                break;
            case 'clear-selection':
                this.clearSelection();
                break;
            case 'prev-page':
                this.goToPreviousPage();
                break;
            case 'next-page':
                this.goToNextPage();
                break;
            case 'retry':
                await this.loadUsers();
                break;
            case 'save-user-settings':
                await this.saveUserSettings();
                break;
            case 'reset-user-password':
                await this.resetUserPassword();
                break;
            case 'delete-user':
                await this.deleteUser();
                break;
            case 'confirm-bulk-role-change':
                await this.confirmBulkRoleChange();
                break;
            case 'confirm-bulk-export':
                await this.confirmBulkExport();
                break;
        }
    }

    async executeBulkAction(action, element) {
        if (this.selectedUsers.size === 0) {
            this.services.notificationService?.show('Please select users first', 'warning');
            return;
        }

        switch (action) {
            case 'activate':
                await this.bulkUpdateStatus('active');
                break;
            case 'deactivate':
                await this.bulkUpdateStatus('inactive');
                break;
            case 'suspend':
                await this.bulkUpdateStatus('suspended');
                break;
            case 'change-role':
                this.showBulkRoleChangeModal();
                break;
            case 'export':
                this.showBulkExportModal();
                break;
        }
    }

    async loadUsers(listId = 'main') {
        try {
            this.showLoadingState();
            const users = await this.services.adminService?.getUsers() || this.getMockUsers();

            if (!this.userLists.has(listId)) {
                this.userLists.set(listId, {
                    users: [],
                    filteredUsers: [],
                    currentPage: 1,
                    usersPerPage: 25,
                    filters: { ...this.defaultFilters },
                    sorting: { ...this.defaultSorting },
                    searchQuery: ''
                });
            }

            const listData = this.userLists.get(listId);
            listData.users = users;

            this.applyFiltersAndSorting(listId);
            this.renderUsers(listId);
            this.hideLoadingState();
        } catch (error) {
            console.error('Failed to load users:', error);
            this.showErrorState();
        }
    }

    getMockUsers() {
        const statuses = Object.keys(this.userStatuses);
        const roles = Object.keys(this.userRoles);

        return Array.from({ length: 150 }, (_, i) => {
            const registrationDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
            const lastActive = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

            return {
                id: `user_${i + 1}`,
                name: `User ${i + 1}`,
                email: `user${i + 1}@example.com`,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                role: roles[Math.floor(Math.random() * roles.length)],
                registrationDate: registrationDate.toISOString(),
                lastActive: lastActive.toISOString(),
                portfolioValue: Math.random() * 10,
                portfolioValueUSD: Math.random() * 500000,
                assetsCount: Math.floor(Math.random() * 20),
                totalSessions: Math.floor(Math.random() * 100),
                emailVerified: Math.random() > 0.2,
                notificationsEnabled: Math.random() > 0.3,
                recentActivity: this.generateMockActivity()
            };
        });
    }

    generateMockActivity() {
        const activities = [
            'Logged in',
            'Updated portfolio',
            'Made a trade',
            'Viewed education content',
            'Changed settings',
            'Exported data'
        ];

        return Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => ({
            id: `activity_${i}`,
            type: activities[Math.floor(Math.random() * activities.length)],
            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            details: `Activity details for action ${i + 1}`
        }));
    }

    applyFiltersAndSorting(listId = 'main') {
        const listData = this.userLists.get(listId);
        if (!listData) return;

        let filteredUsers = [...listData.users];

        if (listData.searchQuery) {
            const query = listData.searchQuery.toLowerCase();
            filteredUsers = filteredUsers.filter(user =>
                user.name.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query) ||
                user.id.toLowerCase().includes(query)
            );
        }

        Object.entries(listData.filters).forEach(([key, value]) => {
            if (value === 'all') return;

            filteredUsers = filteredUsers.filter(user => {
                switch (key) {
                    case 'status':
                    case 'role':
                        return user[key] === value;
                    case 'registrationDate':
                        return this.filterByDateRange(user.registrationDate, value);
                    case 'lastActive':
                        return this.filterByDateRange(user.lastActive, value);
                    case 'hasPortfolio':
                        return value === 'yes' ? user.assetsCount > 0 : user.assetsCount === 0;
                    default:
                        return true;
                }
            });
        });

        filteredUsers.sort((a, b) => {
            const { field, direction } = listData.sorting;
            let aVal = a[field];
            let bVal = b[field];

            if (field === 'registrationDate' || field === 'lastActive') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        listData.filteredUsers = filteredUsers;
        listData.currentPage = 1;
    }

    filterByDateRange(dateString, range) {
        const date = new Date(dateString);
        const now = new Date();

        switch (range) {
            case 'today':
                return date.toDateString() === now.toDateString();
            case 'hour':
                return (now - date) <= 60 * 60 * 1000;
            case 'day':
                return (now - date) <= 24 * 60 * 60 * 1000;
            case 'week':
                return (now - date) <= 7 * 24 * 60 * 60 * 1000;
            case 'month':
                return (now - date) <= 30 * 24 * 60 * 60 * 1000;
            case 'quarter':
                return (now - date) <= 90 * 24 * 60 * 60 * 1000;
            default:
                return true;
        }
    }

    renderUsers(listId = 'main') {
        const listData = this.userLists.get(listId);
        if (!listData) return;

        const { filteredUsers, currentPage, usersPerPage } = listData;
        const startIndex = (currentPage - 1) * usersPerPage;
        const endIndex = startIndex + usersPerPage;
        const pageUsers = filteredUsers.slice(startIndex, endIndex);

        this.renderTableView(pageUsers);
        this.renderCardsView(pageUsers);
        this.updatePagination(listData);
        this.updateResultsCount(filteredUsers.length);
    }

    renderTableView(users) {
        const tbody = document.querySelector('.user-table-body');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr class="user-row" data-user-id="${user.id}">
                <td class="checkbox-col">
                    <input type="checkbox" class="user-checkbox" value="${user.id}"
                           ${this.selectedUsers.has(user.id) ? 'checked' : ''}>
                </td>
                <td class="user-info">
                    <div class="user-avatar">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-details">
                        <div class="user-name">${user.name}</div>
                        <div class="user-email">${user.email}</div>
                    </div>
                </td>
                <td>
                    <span class="role-badge role-${user.role}">
                        ${this.userRoles[user.role]?.label || user.role}
                    </span>
                </td>
                <td>
                    <span class="status-badge" style="color: ${this.userStatuses[user.status]?.color}">
                        ${this.userStatuses[user.status]?.label || user.status}
                    </span>
                </td>
                <td class="portfolio-value">
                    <div class="btc-value">${user.portfolioValue.toFixed(8)} BTC</div>
                    <div class="usd-value">$${user.portfolioValueUSD.toLocaleString()}</div>
                </td>
                <td>
                    <div class="activity-time">${this.formatRelativeTime(user.lastActive)}</div>
                </td>
                <td>
                    <div class="registration-date">${this.formatDate(user.registrationDate)}</div>
                </td>
                <td class="actions-col">
                    <button type="button" class="btn btn-sm btn-outline" data-action="view-user" data-user-id="${user.id}">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderCardsView(users) {
        const cardsGrid = document.querySelector('.user-cards-grid');
        if (!cardsGrid) return;

        cardsGrid.innerHTML = users.map(user => `
            <div class="user-card" data-user-id="${user.id}">
                <div class="user-card-header">
                    <div class="user-avatar large">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-card-info">
                        <h4 class="user-name">${user.name}</h4>
                        <p class="user-email">${user.email}</p>
                    </div>
                    <input type="checkbox" class="user-checkbox" value="${user.id}"
                           ${this.selectedUsers.has(user.id) ? 'checked' : ''}>
                </div>

                <div class="user-card-body">
                    <div class="user-card-row">
                        <span class="label">Role:</span>
                        <span class="role-badge role-${user.role}">
                            ${this.userRoles[user.role]?.label || user.role}
                        </span>
                    </div>

                    <div class="user-card-row">
                        <span class="label">Status:</span>
                        <span class="status-badge" style="color: ${this.userStatuses[user.status]?.color}">
                            ${this.userStatuses[user.status]?.label || user.status}
                        </span>
                    </div>

                    <div class="user-card-row">
                        <span class="label">Portfolio:</span>
                        <div class="portfolio-summary">
                            <div>${user.portfolioValue.toFixed(8)} BTC</div>
                            <div>$${user.portfolioValueUSD.toLocaleString()}</div>
                        </div>
                    </div>

                    <div class="user-card-row">
                        <span class="label">Last Active:</span>
                        <span>${this.formatRelativeTime(user.lastActive)}</span>
                    </div>
                </div>

                <div class="user-card-footer">
                    <button type="button" class="btn btn-sm btn-primary" data-action="view-user" data-user-id="${user.id}">
                        View Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    updatePagination(listData) {
        const { filteredUsers, currentPage, usersPerPage } = listData;
        const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

        const pageInfo = document.querySelector('.page-info');
        const prevBtn = document.querySelector('.prev-page-btn');
        const nextBtn = document.querySelector('.next-page-btn');

        if (pageInfo) {
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        }

        if (prevBtn) {
            prevBtn.disabled = currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = currentPage >= totalPages;
        }
    }

    updateResultsCount(count) {
        const resultsCount = document.querySelector('.results-count');
        if (resultsCount) {
            resultsCount.textContent = `${count} user${count !== 1 ? 's' : ''}`;
        }
    }

    handleUserSelection(checkbox) {
        const userId = checkbox.value;

        if (checkbox.checked) {
            this.selectedUsers.add(userId);
        } else {
            this.selectedUsers.delete(userId);
        }

        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const selectedCount = this.selectedUsers.size;
        const selectedCountEl = document.querySelector('.selected-count');
        const bulkActionsEl = document.querySelector('.bulk-action-buttons');
        const selectAllBtn = document.querySelector('.select-all-btn');
        const clearSelectionBtn = document.querySelector('.clear-selection-btn');

        if (selectedCountEl) {
            selectedCountEl.textContent = `${selectedCount} selected`;
        }

        if (bulkActionsEl) {
            bulkActionsEl.style.display = selectedCount > 0 ? 'flex' : 'none';
        }

        if (selectAllBtn) {
            selectAllBtn.style.display = selectedCount > 0 ? 'none' : 'inline-block';
        }

        if (clearSelectionBtn) {
            clearSelectionBtn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
        }

        document.querySelectorAll('.selected-users-count').forEach(el => {
            el.textContent = selectedCount.toString();
        });
    }

    selectAllVisible() {
        const visibleCheckboxes = document.querySelectorAll('.user-checkbox:not(.select-all-checkbox)');
        visibleCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.selectedUsers.add(checkbox.value);
        });
        this.updateSelectionUI();
    }

    clearSelection() {
        this.selectedUsers.clear();
        document.querySelectorAll('.user-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateSelectionUI();
    }

    toggleSelectAll(checked) {
        const userCheckboxes = document.querySelectorAll('.user-checkbox:not(.select-all-checkbox)');
        userCheckboxes.forEach(checkbox => {
            checkbox.checked = checked;
            if (checked) {
                this.selectedUsers.add(checkbox.value);
            } else {
                this.selectedUsers.delete(checkbox.value);
            }
        });
        this.updateSelectionUI();
    }

    async showUserDetail(userId) {
        const modal = document.getElementById('user-detail-modal');
        const user = this.findUserById(userId);

        if (!user || !modal) return;

        this.populateUserDetailModal(user);
        this.services.modalService?.show(modal);
    }

    populateUserDetailModal(user) {
        document.querySelector('.user-name-display').textContent = user.name;
        document.querySelector('.user-email-display').textContent = user.email;
        document.querySelector('.user-id-display').textContent = user.id;
        document.querySelector('.user-registration-display').textContent = this.formatDate(user.registrationDate);
        document.querySelector('.user-status-display').innerHTML = `<span class="status-badge" style="color: ${this.userStatuses[user.status]?.color}">${this.userStatuses[user.status]?.label}</span>`;
        document.querySelector('.user-role-display').innerHTML = `<span class="role-badge role-${user.role}">${this.userRoles[user.role]?.label}</span>`;
        document.querySelector('.user-last-active-display').textContent = this.formatRelativeTime(user.lastActive);
        document.querySelector('.user-sessions-display').textContent = user.totalSessions.toString();

        document.querySelector('.portfolio-btc-value').textContent = `${user.portfolioValue.toFixed(8)} BTC`;
        document.querySelector('.portfolio-usd-value').textContent = `$${user.portfolioValueUSD.toLocaleString()}`;
        document.querySelector('.portfolio-assets-count').textContent = user.assetsCount.toString();
        document.querySelector('.portfolio-last-trade').textContent = 'N/A';

        this.renderUserActivity(user.recentActivity);

        document.getElementById('user-status-select').value = user.status;
        document.getElementById('user-role-select').value = user.role;
        document.getElementById('user-email-verified').checked = user.emailVerified;
        document.getElementById('user-notifications-enabled').checked = user.notificationsEnabled;
    }

    renderUserActivity(activities) {
        const timeline = document.querySelector('.activity-timeline');
        if (!timeline) return;

        timeline.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-time">${this.formatRelativeTime(activity.timestamp)}</div>
                <div class="activity-content">
                    <div class="activity-type">${activity.type}</div>
                    <div class="activity-details">${activity.details}</div>
                </div>
            </div>
        `).join('');
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.panel === tabName);
        });
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            this.services.modalService?.hide(modal);
        });
    }

    async bulkUpdateStatus(status) {
        try {
            const userIds = Array.from(this.selectedUsers);
            await this.services.adminService?.updateUsersStatus(userIds, status);

            this.clearSelection();
            await this.refreshUsers();

            this.services.notificationService?.show(
                `Updated status for ${userIds.length} users to ${status}`,
                'success'
            );
        } catch (error) {
            console.error('Failed to update user status:', error);
            this.services.notificationService?.show('Failed to update user status', 'error');
        }
    }

    showBulkRoleChangeModal() {
        const modal = document.getElementById('bulk-role-change-modal');
        if (modal) {
            this.services.modalService?.show(modal);
        }
    }

    showBulkExportModal() {
        const modal = document.getElementById('bulk-export-modal');
        if (modal) {
            this.services.modalService?.show(modal);
        }
    }

    async confirmBulkRoleChange() {
        const roleSelect = document.getElementById('bulk-role-select');
        const notifyCheckbox = document.getElementById('bulk-notify-users');

        if (!roleSelect) return;

        try {
            const userIds = Array.from(this.selectedUsers);
            await this.services.adminService?.updateUsersRole(userIds, roleSelect.value, notifyCheckbox?.checked);

            this.clearSelection();
            await this.refreshUsers();
            this.closeModal();

            this.services.notificationService?.show(
                `Updated role for ${userIds.length} users to ${roleSelect.value}`,
                'success'
            );
        } catch (error) {
            console.error('Failed to update user roles:', error);
            this.services.notificationService?.show('Failed to update user roles', 'error');
        }
    }

    async confirmBulkExport() {
        const formatSelect = document.getElementById('export-format-select');
        const includeFields = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(cb => cb.value);

        if (!formatSelect) return;

        try {
            const userIds = Array.from(this.selectedUsers);
            const exportData = await this.generateExportData(userIds, includeFields);

            this.downloadExport(exportData, formatSelect.value);
            this.closeModal();

            this.services.notificationService?.show(
                `Exported ${userIds.length} users successfully`,
                'success'
            );
        } catch (error) {
            console.error('Failed to export users:', error);
            this.services.notificationService?.show('Failed to export users', 'error');
        }
    }

    async generateExportData(userIds, includeFields) {
        const users = userIds.map(id => this.findUserById(id)).filter(Boolean);

        return users.map(user => {
            const exportUser = {
                id: user.id,
                name: user.name,
                email: user.email,
                status: user.status,
                role: user.role,
                registrationDate: user.registrationDate,
                lastActive: user.lastActive
            };

            if (includeFields.includes('portfolio')) {
                exportUser.portfolioValue = user.portfolioValue;
                exportUser.portfolioValueUSD = user.portfolioValueUSD;
                exportUser.assetsCount = user.assetsCount;
            }

            if (includeFields.includes('activity')) {
                exportUser.totalSessions = user.totalSessions;
                exportUser.recentActivity = user.recentActivity;
            }

            if (includeFields.includes('settings')) {
                exportUser.emailVerified = user.emailVerified;
                exportUser.notificationsEnabled = user.notificationsEnabled;
            }

            return exportUser;
        });
    }

    downloadExport(data, format) {
        let content, filename, mimeType;

        switch (format) {
            case 'csv':
                content = this.convertToCSV(data);
                filename = 'users_export.csv';
                mimeType = 'text/csv';
                break;
            case 'json':
                content = JSON.stringify(data, null, 2);
                filename = 'users_export.json';
                mimeType = 'application/json';
                break;
            case 'pdf':
                this.services.notificationService?.show('PDF export not implemented yet', 'info');
                return;
            default:
                return;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');

        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = row[header];
                if (typeof value === 'object') {
                    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                }
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',');
        });

        return [csvHeaders, ...csvRows].join('\n');
    }

    findUserById(userId) {
        for (const listData of this.userLists.values()) {
            const user = listData.users.find(u => u.id === userId);
            if (user) return user;
        }
        return null;
    }

    applyFilters() {
        const listData = this.userLists.get('main');
        if (!listData) return;

        document.querySelectorAll('.filter-select').forEach(select => {
            const filterKey = select.dataset.filter;
            if (filterKey) {
                listData.filters[filterKey] = select.value;
            }
        });

        this.applyFiltersAndSorting('main');
        this.renderUsers('main');
    }

    applySorting() {
        const listData = this.userLists.get('main');
        if (!listData) return;

        const sortField = document.querySelector('[data-sort="field"]')?.value;
        const sortDirection = document.querySelector('[data-sort="direction"]')?.dataset.direction;

        if (sortField) {
            listData.sorting.field = sortField;
        }

        if (sortDirection) {
            listData.sorting.direction = sortDirection;
        }

        this.applyFiltersAndSorting('main');
        this.renderUsers('main');
    }

    performSearch(query) {
        const listData = this.userLists.get('main');
        if (!listData) return;

        listData.searchQuery = query;
        this.applyFiltersAndSorting('main');
        this.renderUsers('main');
    }

    goToPreviousPage() {
        const listData = this.userLists.get('main');
        if (!listData || listData.currentPage <= 1) return;

        listData.currentPage--;
        this.renderUsers('main');
    }

    goToNextPage() {
        const listData = this.userLists.get('main');
        if (!listData) return;

        const totalPages = Math.ceil(listData.filteredUsers.length / listData.usersPerPage);
        if (listData.currentPage >= totalPages) return;

        listData.currentPage++;
        this.renderUsers('main');
    }

    async refreshUsers() {
        await this.loadUsers('main');
    }

    showLoadingState() {
        const container = document.getElementById('user-management-container');
        if (!container) return;

        container.querySelector('.user-list-container').style.display = 'none';
        container.querySelector('.loading-state').style.display = 'flex';
        container.querySelector('.error-state').style.display = 'none';
        container.querySelector('.empty-state').style.display = 'none';
    }

    hideLoadingState() {
        const container = document.getElementById('user-management-container');
        if (!container) return;

        container.querySelector('.loading-state').style.display = 'none';
        container.querySelector('.user-list-container').style.display = 'block';
    }

    showErrorState() {
        const container = document.getElementById('user-management-container');
        if (!container) return;

        container.querySelector('.user-list-container').style.display = 'none';
        container.querySelector('.loading-state').style.display = 'none';
        container.querySelector('.error-state').style.display = 'flex';
        container.querySelector('.empty-state').style.display = 'none';
    }

    showEmptyState() {
        const container = document.getElementById('user-management-container');
        if (!container) return;

        container.querySelector('.user-list-container').style.display = 'none';
        container.querySelector('.loading-state').style.display = 'none';
        container.querySelector('.error-state').style.display = 'none';
        container.querySelector('.empty-state').style.display = 'flex';
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.refreshUsers();
        }, 30000);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return this.formatDate(dateString);
    }

    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.selectedUsers.clear();
        this.userLists.clear();
        this.isInitialized = false;
    }

    destroy() {
        this.cleanup();

        const container = document.getElementById('user-management-container');
        if (container) {
            container.removeEventListener('click', this.handleClick.bind(this));
            container.removeEventListener('change', this.handleChange.bind(this));
            container.removeEventListener('input', this.handleInput.bind(this));
        }

        document.removeEventListener('click', this.handleModalClick.bind(this));
        window.removeEventListener('beforeunload', this.cleanup.bind(this));

        const modals = ['user-detail-modal', 'bulk-role-change-modal', 'bulk-export-modal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.remove();
            }
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManagement;
} else if (typeof window !== 'undefined') {
    window.UserManagement = UserManagement;
}