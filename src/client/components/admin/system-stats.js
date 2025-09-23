class SystemStats {
    constructor(services = {}) {
        this.services = services;
        this.statsData = new Map();
        this.isInitialized = false;
        this.refreshInterval = null;
        this.autoRefreshEnabled = true;
        this.chartInstances = new Map();
        this.timeRange = '24h';

        this.statCategories = {
            overview: {
                label: 'System Overview',
                metrics: ['totalUsers', 'activeUsers', 'totalPortfolios', 'totalTrades', 'systemUptime', 'serverLoad']
            },
            performance: {
                label: 'Performance Metrics',
                metrics: ['responseTime', 'throughput', 'errorRate', 'memoryUsage', 'cpuUsage', 'diskUsage']
            },
            financial: {
                label: 'Financial Metrics',
                metrics: ['totalPortfolioValue', 'tradingVolume', 'conversionVolume', 'averagePortfolioSize', 'newInvestments', 'withdrawals']
            },
            engagement: {
                label: 'User Engagement',
                metrics: ['pageViews', 'sessionDuration', 'bounceRate', 'educationProgress', 'featureUsage', 'feedbackScore']
            },
            security: {
                label: 'Security & Health',
                metrics: ['failedLogins', 'suspiciousActivity', 'dataIntegrity', 'backupStatus', 'sslStatus', 'databaseHealth']
            }
        };

        this.timeRanges = {
            '1h': { label: '1 Hour', minutes: 60 },
            '24h': { label: '24 Hours', minutes: 1440 },
            '7d': { label: '7 Days', minutes: 10080 },
            '30d': { label: '30 Days', minutes: 43200 },
            '90d': { label: '90 Days', minutes: 129600 }
        };

        this.refreshIntervals = {
            realtime: 5000,
            normal: 30000,
            slow: 300000
        };
    }

    async init() {
        if (this.isInitialized) return;

        try {
            this.createSystemStatsInterface();
            this.attachEventListeners();
            await this.loadAllStats();
            this.startAutoRefresh();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize system stats:', error);
            this.services.notificationService?.show('Failed to initialize system stats', 'error');
        }
    }

    createSystemStatsInterface() {
        const container = document.getElementById('system-stats-container');
        if (!container) return;

        container.innerHTML = `
            <div class="system-stats-wrapper">
                <div class="system-stats-header">
                    <div class="header-top">
                        <h2 class="section-title">System Statistics</h2>
                        <div class="header-actions">
                            <div class="time-range-selector">
                                <label for="time-range-select">Time Range:</label>
                                <select id="time-range-select" class="time-range-select">
                                    <option value="1h">Last Hour</option>
                                    <option value="24h" selected>Last 24 Hours</option>
                                    <option value="7d">Last 7 Days</option>
                                    <option value="30d">Last 30 Days</option>
                                    <option value="90d">Last 90 Days</option>
                                </select>
                            </div>

                            <div class="refresh-controls">
                                <button type="button" class="btn btn-sm toggle-refresh-btn ${this.autoRefreshEnabled ? 'active' : ''}"
                                        data-action="toggle-refresh" title="Toggle Auto-Refresh">
                                    <i class="icon-refresh"></i>
                                    Auto
                                </button>
                                <button type="button" class="btn btn-sm refresh-btn" data-action="refresh">
                                    <i class="icon-refresh"></i>
                                    Refresh
                                </button>
                            </div>

                            <div class="export-controls">
                                <button type="button" class="btn btn-outline export-btn" data-action="export-stats">
                                    <i class="icon-download"></i>
                                    Export
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="stats-navigation">
                        <div class="category-tabs">
                            <button type="button" class="tab-btn active" data-category="overview">Overview</button>
                            <button type="button" class="tab-btn" data-category="performance">Performance</button>
                            <button type="button" class="tab-btn" data-category="financial">Financial</button>
                            <button type="button" class="tab-btn" data-category="engagement">Engagement</button>
                            <button type="button" class="tab-btn" data-category="security">Security</button>
                        </div>

                        <div class="view-controls">
                            <button type="button" class="btn btn-sm view-btn active" data-view="cards">
                                <i class="icon-grid"></i>
                                Cards
                            </button>
                            <button type="button" class="btn btn-sm view-btn" data-view="charts">
                                <i class="icon-bar-chart"></i>
                                Charts
                            </button>
                            <button type="button" class="btn btn-sm view-btn" data-view="table">
                                <i class="icon-list"></i>
                                Table
                            </button>
                        </div>
                    </div>

                    <div class="system-health-summary">
                        <div class="health-indicator overall-health">
                            <div class="indicator-icon">
                                <div class="status-dot healthy"></div>
                            </div>
                            <div class="indicator-content">
                                <h4>System Health</h4>
                                <p class="health-status">All Systems Operational</p>
                            </div>
                        </div>

                        <div class="quick-stats">
                            <div class="quick-stat">
                                <div class="stat-value">--</div>
                                <div class="stat-label">Active Users</div>
                            </div>
                            <div class="quick-stat">
                                <div class="stat-value">--</div>
                                <div class="stat-label">Response Time</div>
                            </div>
                            <div class="quick-stat">
                                <div class="stat-value">--</div>
                                <div class="stat-label">Uptime</div>
                            </div>
                            <div class="quick-stat">
                                <div class="stat-value">--</div>
                                <div class="stat-label">Trading Volume</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="stats-content">
                    <div class="stats-cards-view active">
                        ${Object.keys(this.statCategories).map(categoryKey => `
                            <div class="stats-category" data-category="${categoryKey}" ${categoryKey !== 'overview' ? 'style="display: none;"' : ''}>
                                <div class="category-header">
                                    <h3>${this.statCategories[categoryKey].label}</h3>
                                    <div class="category-actions">
                                        <button type="button" class="btn btn-sm" data-action="refresh-category" data-category="${categoryKey}">
                                            <i class="icon-refresh"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="stats-grid" id="${categoryKey}-stats-grid">
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="stats-charts-view">
                        <div class="charts-container">
                            <div class="chart-section">
                                <h4>System Performance Over Time</h4>
                                <div class="chart-wrapper">
                                    <canvas id="performance-chart"></canvas>
                                </div>
                            </div>

                            <div class="chart-section">
                                <h4>User Activity Trends</h4>
                                <div class="chart-wrapper">
                                    <canvas id="activity-chart"></canvas>
                                </div>
                            </div>

                            <div class="chart-section">
                                <h4>Financial Metrics</h4>
                                <div class="chart-wrapper">
                                    <canvas id="financial-chart"></canvas>
                                </div>
                            </div>

                            <div class="chart-section">
                                <h4>Resource Usage</h4>
                                <div class="chart-wrapper">
                                    <canvas id="resources-chart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="stats-table-view">
                        <div class="table-container">
                            <table class="stats-table">
                                <thead>
                                    <tr>
                                        <th>Metric</th>
                                        <th>Current Value</th>
                                        <th>Previous Value</th>
                                        <th>Change</th>
                                        <th>Trend</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody class="stats-table-body">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="loading-state" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>Loading system statistics...</p>
                </div>

                <div class="error-state" style="display: none;">
                    <div class="error-icon">⚠️</div>
                    <h3>Failed to Load Statistics</h3>
                    <p>There was an error loading the system statistics. Please try refreshing.</p>
                    <button type="button" class="btn btn-primary retry-btn" data-action="retry">
                        Try Again
                    </button>
                </div>
            </div>
        `;

        this.createExportModal();
        this.createAlertModal();
    }

    createExportModal() {
        const modalHTML = `
            <div id="stats-export-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Export Statistics</h3>
                        <button type="button" class="modal-close" data-action="close-modal">
                            <i class="icon-x"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <div class="form-group">
                            <label for="export-format-select">Export Format:</label>
                            <select id="export-format-select" class="form-control">
                                <option value="csv">CSV (Spreadsheet)</option>
                                <option value="json">JSON (Developer)</option>
                                <option value="pdf">PDF (Report)</option>
                                <option value="xlsx">Excel (Advanced)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Include Categories:</label>
                            <div class="checkbox-group">
                                <label><input type="checkbox" value="overview" checked> Overview</label>
                                <label><input type="checkbox" value="performance" checked> Performance</label>
                                <label><input type="checkbox" value="financial" checked> Financial</label>
                                <label><input type="checkbox" value="engagement" checked> Engagement</label>
                                <label><input type="checkbox" value="security" checked> Security</label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="export-time-range">Time Range:</label>
                            <select id="export-time-range" class="form-control">
                                <option value="1h">Last Hour</option>
                                <option value="24h">Last 24 Hours</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="90d">Last 90 Days</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="include-charts" checked>
                                Include Charts (PDF/Excel only)
                            </label>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" data-action="close-modal">Cancel</button>
                        <button type="button" class="btn btn-primary" data-action="confirm-export">
                            Export Statistics
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    createAlertModal() {
        const modalHTML = `
            <div id="stats-alert-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">System Alert</h3>
                        <button type="button" class="modal-close" data-action="close-modal">
                            <i class="icon-x"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <div class="alert-content">
                            <div class="alert-icon">⚠️</div>
                            <div class="alert-message">
                                <h4 class="alert-title">High Resource Usage Detected</h4>
                                <p class="alert-description">System resources are running high. Please check the performance metrics.</p>
                            </div>
                        </div>

                        <div class="alert-details">
                            <div class="detail-item">
                                <label>Alert Type:</label>
                                <span class="alert-type">Performance</span>
                            </div>
                            <div class="detail-item">
                                <label>Severity:</label>
                                <span class="alert-severity">Warning</span>
                            </div>
                            <div class="detail-item">
                                <label>Time:</label>
                                <span class="alert-time">--</span>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" data-action="close-modal">Dismiss</button>
                        <button type="button" class="btn btn-primary" data-action="investigate-alert">
                            Investigate
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    attachEventListeners() {
        const container = document.getElementById('system-stats-container');
        if (!container) return;

        container.addEventListener('click', this.handleClick.bind(this));
        container.addEventListener('change', this.handleChange.bind(this));

        document.addEventListener('click', this.handleModalClick.bind(this));
        window.addEventListener('beforeunload', this.cleanup.bind(this));
    }

    handleClick(event) {
        const action = event.target.dataset.action;
        const category = event.target.dataset.category;
        const view = event.target.dataset.view;

        if (action) {
            event.preventDefault();
            this.executeAction(action, event.target);
        } else if (category) {
            this.switchCategory(category);
        } else if (view) {
            this.switchView(view);
        }
    }

    handleChange(event) {
        if (event.target.classList.contains('time-range-select')) {
            this.timeRange = event.target.value;
            this.refreshAllStats();
        }
    }

    handleModalClick(event) {
        if (event.target.dataset.action === 'close-modal') {
            this.closeModal();
        }
    }

    async executeAction(action, element) {
        switch (action) {
            case 'refresh':
                await this.refreshAllStats();
                break;
            case 'toggle-refresh':
                this.toggleAutoRefresh();
                break;
            case 'export-stats':
                this.showExportModal();
                break;
            case 'refresh-category':
                const category = element.dataset.category;
                if (category) {
                    await this.refreshCategoryStats(category);
                }
                break;
            case 'retry':
                await this.loadAllStats();
                break;
            case 'confirm-export':
                await this.confirmExport();
                break;
            case 'investigate-alert':
                this.investigateAlert();
                break;
        }
    }

    async loadAllStats() {
        try {
            this.showLoadingState();

            const stats = await this.services.adminService?.getSystemStats(this.timeRange) || this.getMockStats();

            Object.keys(this.statCategories).forEach(category => {
                this.statsData.set(category, stats[category] || {});
            });

            this.renderAllViews();
            this.updateQuickStats();
            this.updateSystemHealth();
            this.hideLoadingState();

        } catch (error) {
            console.error('Failed to load system stats:', error);
            this.showErrorState();
        }
    }

    getMockStats() {
        const now = Date.now();
        const baseStats = {
            overview: {
                totalUsers: { value: 1542, change: 12, trend: 'up', status: 'healthy' },
                activeUsers: { value: 387, change: -5, trend: 'down', status: 'warning' },
                totalPortfolios: { value: 1289, change: 8, trend: 'up', status: 'healthy' },
                totalTrades: { value: 45672, change: 234, trend: 'up', status: 'healthy' },
                systemUptime: { value: '99.8%', change: 0.1, trend: 'stable', status: 'healthy' },
                serverLoad: { value: '67%', change: 5, trend: 'up', status: 'warning' }
            },
            performance: {
                responseTime: { value: '120ms', change: -15, trend: 'down', status: 'healthy' },
                throughput: { value: '2.4K req/min', change: 120, trend: 'up', status: 'healthy' },
                errorRate: { value: '0.12%', change: 0.02, trend: 'up', status: 'warning' },
                memoryUsage: { value: '72%', change: 3, trend: 'up', status: 'warning' },
                cpuUsage: { value: '45%', change: -2, trend: 'down', status: 'healthy' },
                diskUsage: { value: '58%', change: 1, trend: 'up', status: 'healthy' }
            },
            financial: {
                totalPortfolioValue: { value: '2,847 BTC', change: 156, trend: 'up', status: 'healthy' },
                tradingVolume: { value: '1.2M sats', change: 45000, trend: 'up', status: 'healthy' },
                conversionVolume: { value: '890K sats', change: -12000, trend: 'down', status: 'warning' },
                averagePortfolioSize: { value: '2.21 BTC', change: 0.05, trend: 'up', status: 'healthy' },
                newInvestments: { value: '$124K', change: 8900, trend: 'up', status: 'healthy' },
                withdrawals: { value: '$89K', change: -3400, trend: 'down', status: 'healthy' }
            },
            engagement: {
                pageViews: { value: '15.6K', change: 890, trend: 'up', status: 'healthy' },
                sessionDuration: { value: '8m 34s', change: 45, trend: 'up', status: 'healthy' },
                bounceRate: { value: '23%', change: -2, trend: 'down', status: 'healthy' },
                educationProgress: { value: '67%', change: 5, trend: 'up', status: 'healthy' },
                featureUsage: { value: '89%', change: 3, trend: 'up', status: 'healthy' },
                feedbackScore: { value: '4.7/5', change: 0.1, trend: 'up', status: 'healthy' }
            },
            security: {
                failedLogins: { value: '12', change: -3, trend: 'down', status: 'healthy' },
                suspiciousActivity: { value: '2', change: 0, trend: 'stable', status: 'healthy' },
                dataIntegrity: { value: '100%', change: 0, trend: 'stable', status: 'healthy' },
                backupStatus: { value: 'Success', change: 0, trend: 'stable', status: 'healthy' },
                sslStatus: { value: 'Valid', change: 0, trend: 'stable', status: 'healthy' },
                databaseHealth: { value: '98%', change: 1, trend: 'up', status: 'healthy' }
            }
        };

        return baseStats;
    }

    renderAllViews() {
        this.renderCardsView();
        this.renderChartsView();
        this.renderTableView();
    }

    renderCardsView() {
        Object.keys(this.statCategories).forEach(categoryKey => {
            const grid = document.getElementById(`${categoryKey}-stats-grid`);
            if (!grid) return;

            const categoryData = this.statsData.get(categoryKey) || {};
            const metrics = this.statCategories[categoryKey].metrics;

            grid.innerHTML = metrics.map(metricKey => {
                const metric = categoryData[metricKey];
                if (!metric) return '';

                return `
                    <div class="stat-card ${metric.status}" data-metric="${metricKey}">
                        <div class="stat-card-header">
                            <h4 class="stat-title">${this.formatMetricName(metricKey)}</h4>
                            <div class="stat-status">
                                <div class="status-dot ${metric.status}"></div>
                            </div>
                        </div>

                        <div class="stat-card-body">
                            <div class="stat-value">${metric.value}</div>

                            <div class="stat-change ${metric.trend}">
                                <i class="icon-${this.getTrendIcon(metric.trend)}"></i>
                                <span class="change-value">${this.formatChange(metric.change)}</span>
                                <span class="change-period">vs previous</span>
                            </div>
                        </div>

                        <div class="stat-card-footer">
                            <div class="stat-trend">
                                <div class="trend-chart" data-metric="${metricKey}">
                                    ${this.generateSparkline(metricKey)}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        });
    }

    renderChartsView() {
        this.renderPerformanceChart();
        this.renderActivityChart();
        this.renderFinancialChart();
        this.renderResourcesChart();
    }

    renderPerformanceChart() {
        const canvas = document.getElementById('performance-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.chartInstances.has('performance')) {
            this.chartInstances.get('performance').destroy();
        }

        const mockData = this.generateMockTimeSeriesData('performance');

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: mockData.labels,
                datasets: [
                    {
                        label: 'Response Time (ms)',
                        data: mockData.responseTime,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Error Rate (%)',
                        data: mockData.errorRate,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });

        this.chartInstances.set('performance', chart);
    }

    renderActivityChart() {
        const canvas = document.getElementById('activity-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.chartInstances.has('activity')) {
            this.chartInstances.get('activity').destroy();
        }

        const mockData = this.generateMockTimeSeriesData('activity');

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: mockData.labels,
                datasets: [
                    {
                        label: 'Active Users',
                        data: mockData.activeUsers,
                        backgroundColor: '#10b981',
                        borderColor: '#059669',
                        borderWidth: 1
                    },
                    {
                        label: 'New Registrations',
                        data: mockData.newUsers,
                        backgroundColor: '#8b5cf6',
                        borderColor: '#7c3aed',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        this.chartInstances.set('activity', chart);
    }

    renderFinancialChart() {
        const canvas = document.getElementById('financial-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.chartInstances.has('financial')) {
            this.chartInstances.get('financial').destroy();
        }

        const mockData = this.generateMockTimeSeriesData('financial');

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: mockData.labels,
                datasets: [
                    {
                        label: 'Trading Volume (BTC)',
                        data: mockData.tradingVolume,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Total Portfolio Value (BTC)',
                        data: mockData.portfolioValue,
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });

        this.chartInstances.set('financial', chart);
    }

    renderResourcesChart() {
        const canvas = document.getElementById('resources-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (this.chartInstances.has('resources')) {
            this.chartInstances.get('resources').destroy();
        }

        const data = {
            labels: ['CPU Usage', 'Memory Usage', 'Disk Usage', 'Network I/O'],
            datasets: [{
                data: [45, 72, 58, 33],
                backgroundColor: [
                    '#3b82f6',
                    '#ef4444',
                    '#f59e0b',
                    '#10b981'
                ],
                borderWidth: 2
            }]
        };

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        this.chartInstances.set('resources', chart);
    }

    renderTableView() {
        const tbody = document.querySelector('.stats-table-body');
        if (!tbody) return;

        const allMetrics = [];

        Object.keys(this.statCategories).forEach(categoryKey => {
            const categoryData = this.statsData.get(categoryKey) || {};
            const metrics = this.statCategories[categoryKey].metrics;

            metrics.forEach(metricKey => {
                const metric = categoryData[metricKey];
                if (metric) {
                    allMetrics.push({
                        name: this.formatMetricName(metricKey),
                        category: this.statCategories[categoryKey].label,
                        ...metric
                    });
                }
            });
        });

        tbody.innerHTML = allMetrics.map(metric => `
            <tr class="stat-row ${metric.status}">
                <td>
                    <div class="metric-info">
                        <div class="metric-name">${metric.name}</div>
                        <div class="metric-category">${metric.category}</div>
                    </div>
                </td>
                <td class="current-value">${metric.value}</td>
                <td class="previous-value">${this.calculatePreviousValue(metric.value, metric.change)}</td>
                <td class="change-value ${metric.trend}">
                    ${this.formatChange(metric.change)}
                </td>
                <td class="trend-indicator">
                    <i class="icon-${this.getTrendIcon(metric.trend)}"></i>
                    <span class="trend-label">${metric.trend}</span>
                </td>
                <td class="status-indicator">
                    <span class="status-badge ${metric.status}">
                        <div class="status-dot ${metric.status}"></div>
                        ${metric.status}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    generateMockTimeSeriesData(type) {
        const dataPoints = this.timeRanges[this.timeRange].minutes / 60;
        const labels = Array.from({ length: dataPoints }, (_, i) => {
            const date = new Date(Date.now() - (dataPoints - i - 1) * 60 * 60 * 1000);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });

        switch (type) {
            case 'performance':
                return {
                    labels,
                    responseTime: Array.from({ length: dataPoints }, () => Math.random() * 50 + 100),
                    errorRate: Array.from({ length: dataPoints }, () => Math.random() * 0.5)
                };
            case 'activity':
                return {
                    labels,
                    activeUsers: Array.from({ length: dataPoints }, () => Math.floor(Math.random() * 100 + 300)),
                    newUsers: Array.from({ length: dataPoints }, () => Math.floor(Math.random() * 20 + 5))
                };
            case 'financial':
                return {
                    labels,
                    tradingVolume: Array.from({ length: dataPoints }, () => Math.random() * 50 + 200),
                    portfolioValue: Array.from({ length: dataPoints }, () => Math.random() * 100 + 2700)
                };
            default:
                return { labels, data: [] };
        }
    }

    generateSparkline(metricKey) {
        const points = Array.from({ length: 20 }, () => Math.random() * 100);
        const max = Math.max(...points);
        const min = Math.min(...points);

        return points.map((point, i) => {
            const x = (i / (points.length - 1)) * 100;
            const y = 100 - ((point - min) / (max - min)) * 100;
            return i === 0 ? `M${x},${y}` : `L${x},${y}`;
        }).join(' ');
    }

    updateQuickStats() {
        const quickStats = document.querySelectorAll('.quick-stat');
        const overviewData = this.statsData.get('overview') || {};
        const performanceData = this.statsData.get('performance') || {};
        const financialData = this.statsData.get('financial') || {};

        if (quickStats[0] && overviewData.activeUsers) {
            quickStats[0].querySelector('.stat-value').textContent = overviewData.activeUsers.value;
        }

        if (quickStats[1] && performanceData.responseTime) {
            quickStats[1].querySelector('.stat-value').textContent = performanceData.responseTime.value;
        }

        if (quickStats[2] && overviewData.systemUptime) {
            quickStats[2].querySelector('.stat-value').textContent = overviewData.systemUptime.value;
        }

        if (quickStats[3] && financialData.tradingVolume) {
            quickStats[3].querySelector('.stat-value').textContent = financialData.tradingVolume.value;
        }
    }

    updateSystemHealth() {
        const healthIndicator = document.querySelector('.overall-health');
        const healthStatus = document.querySelector('.health-status');
        const statusDot = document.querySelector('.overall-health .status-dot');

        if (!healthIndicator || !healthStatus || !statusDot) return;

        const allStats = Array.from(this.statsData.values()).flat();
        const criticalIssues = allStats.filter(stat => stat.status === 'critical').length;
        const warnings = allStats.filter(stat => stat.status === 'warning').length;

        let overallStatus, statusText, statusClass;

        if (criticalIssues > 0) {
            overallStatus = 'critical';
            statusText = `${criticalIssues} Critical Issue${criticalIssues > 1 ? 's' : ''} Detected`;
            statusClass = 'critical';
        } else if (warnings > 2) {
            overallStatus = 'warning';
            statusText = `${warnings} Warning${warnings > 1 ? 's' : ''} - Monitor Closely`;
            statusClass = 'warning';
        } else if (warnings > 0) {
            overallStatus = 'caution';
            statusText = `${warnings} Minor Warning${warnings > 1 ? 's' : ''}`;
            statusClass = 'warning';
        } else {
            overallStatus = 'healthy';
            statusText = 'All Systems Operational';
            statusClass = 'healthy';
        }

        statusDot.className = `status-dot ${statusClass}`;
        healthStatus.textContent = statusText;
        healthIndicator.className = `health-indicator overall-health ${statusClass}`;
    }

    switchCategory(categoryKey) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === categoryKey);
        });

        document.querySelectorAll('.stats-category').forEach(category => {
            category.style.display = category.dataset.category === categoryKey ? 'block' : 'none';
        });
    }

    switchView(viewName) {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        document.querySelector('.stats-cards-view').classList.toggle('active', viewName === 'cards');
        document.querySelector('.stats-charts-view').style.display = viewName === 'charts' ? 'block' : 'none';
        document.querySelector('.stats-table-view').style.display = viewName === 'table' ? 'block' : 'none';
    }

    async refreshAllStats() {
        await this.loadAllStats();
        this.services.notificationService?.show('Statistics refreshed', 'success');
    }

    async refreshCategoryStats(category) {
        try {
            const stats = await this.services.adminService?.getSystemStats(this.timeRange, category) || this.getMockStats();
            this.statsData.set(category, stats[category] || {});

            this.renderCardsView();
            this.updateQuickStats();
            this.updateSystemHealth();

            this.services.notificationService?.show(`${this.statCategories[category].label} refreshed`, 'success');
        } catch (error) {
            console.error(`Failed to refresh ${category} stats:`, error);
            this.services.notificationService?.show(`Failed to refresh ${category} stats`, 'error');
        }
    }

    toggleAutoRefresh() {
        this.autoRefreshEnabled = !this.autoRefreshEnabled;

        const toggleBtn = document.querySelector('.toggle-refresh-btn');
        if (toggleBtn) {
            toggleBtn.classList.toggle('active', this.autoRefreshEnabled);
        }

        if (this.autoRefreshEnabled) {
            this.startAutoRefresh();
            this.services.notificationService?.show('Auto-refresh enabled', 'info');
        } else {
            this.stopAutoRefresh();
            this.services.notificationService?.show('Auto-refresh disabled', 'info');
        }
    }

    showExportModal() {
        const modal = document.getElementById('stats-export-modal');
        if (modal) {
            document.getElementById('export-time-range').value = this.timeRange;
            this.services.modalService?.show(modal);
        }
    }

    async confirmExport() {
        const formatSelect = document.getElementById('export-format-select');
        const timeRangeSelect = document.getElementById('export-time-range');
        const includeCategories = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(cb => cb.value);
        const includeCharts = document.getElementById('include-charts').checked;

        try {
            const exportData = await this.generateExportData(includeCategories, timeRangeSelect.value);
            this.downloadExport(exportData, formatSelect.value, includeCharts);
            this.closeModal();

            this.services.notificationService?.show('Statistics exported successfully', 'success');
        } catch (error) {
            console.error('Failed to export statistics:', error);
            this.services.notificationService?.show('Failed to export statistics', 'error');
        }
    }

    async generateExportData(categories, timeRange) {
        const exportData = {
            exportDate: new Date().toISOString(),
            timeRange: timeRange,
            categories: {}
        };

        categories.forEach(category => {
            const categoryData = this.statsData.get(category);
            if (categoryData) {
                exportData.categories[category] = {
                    label: this.statCategories[category].label,
                    metrics: categoryData
                };
            }
        });

        return exportData;
    }

    downloadExport(data, format, includeCharts) {
        let content, filename, mimeType;

        switch (format) {
            case 'csv':
                content = this.convertToCSV(data);
                filename = `system_stats_${this.timeRange}.csv`;
                mimeType = 'text/csv';
                break;
            case 'json':
                content = JSON.stringify(data, null, 2);
                filename = `system_stats_${this.timeRange}.json`;
                mimeType = 'application/json';
                break;
            case 'pdf':
            case 'xlsx':
                this.services.notificationService?.show(`${format.toUpperCase()} export not implemented yet`, 'info');
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
        const rows = [];
        rows.push(['Category', 'Metric', 'Value', 'Change', 'Trend', 'Status']);

        Object.entries(data.categories).forEach(([categoryKey, categoryData]) => {
            Object.entries(categoryData.metrics).forEach(([metricKey, metric]) => {
                rows.push([
                    categoryData.label,
                    this.formatMetricName(metricKey),
                    metric.value,
                    metric.change,
                    metric.trend,
                    metric.status
                ]);
            });
        });

        return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    formatMetricName(metricKey) {
        return metricKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    formatChange(change) {
        if (typeof change === 'number') {
            return change > 0 ? `+${change}` : change.toString();
        }
        return change;
    }

    getTrendIcon(trend) {
        switch (trend) {
            case 'up': return 'trending-up';
            case 'down': return 'trending-down';
            case 'stable': return 'minus';
            default: return 'help-circle';
        }
    }

    calculatePreviousValue(currentValue, change) {
        if (typeof currentValue === 'string' && currentValue.includes('%')) {
            const numValue = parseFloat(currentValue);
            const prevValue = numValue - change;
            return `${prevValue.toFixed(1)}%`;
        }
        return '--';
    }

    startAutoRefresh() {
        this.stopAutoRefresh();

        if (this.autoRefreshEnabled) {
            this.refreshInterval = setInterval(() => {
                this.refreshAllStats();
            }, this.refreshIntervals.normal);
        }
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            this.services.modalService?.hide(modal);
        });
    }

    showLoadingState() {
        const container = document.getElementById('system-stats-container');
        if (!container) return;

        container.querySelector('.stats-content').style.display = 'none';
        container.querySelector('.loading-state').style.display = 'flex';
        container.querySelector('.error-state').style.display = 'none';
    }

    hideLoadingState() {
        const container = document.getElementById('system-stats-container');
        if (!container) return;

        container.querySelector('.loading-state').style.display = 'none';
        container.querySelector('.stats-content').style.display = 'block';
    }

    showErrorState() {
        const container = document.getElementById('system-stats-container');
        if (!container) return;

        container.querySelector('.stats-content').style.display = 'none';
        container.querySelector('.loading-state').style.display = 'none';
        container.querySelector('.error-state').style.display = 'flex';
    }

    investigateAlert() {
        this.closeModal();
        this.switchView('charts');
        this.switchCategory('performance');
        this.services.notificationService?.show('Investigating performance metrics...', 'info');
    }

    cleanup() {
        this.stopAutoRefresh();

        this.chartInstances.forEach(chart => {
            chart.destroy();
        });
        this.chartInstances.clear();

        this.statsData.clear();
        this.isInitialized = false;
    }

    destroy() {
        this.cleanup();

        const container = document.getElementById('system-stats-container');
        if (container) {
            container.removeEventListener('click', this.handleClick.bind(this));
            container.removeEventListener('change', this.handleChange.bind(this));
        }

        document.removeEventListener('click', this.handleModalClick.bind(this));
        window.removeEventListener('beforeunload', this.cleanup.bind(this));

        const modals = ['stats-export-modal', 'stats-alert-modal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.remove();
            }
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemStats;
} else if (typeof window !== 'undefined') {
    window.SystemStats = SystemStats;
}