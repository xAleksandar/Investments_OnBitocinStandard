/**
 * Performance Chart Component
 * Portfolio performance visualization with various chart types and time periods
 * Extracted from monolithic BitcoinGame class as part of Task 6.3
 */

import { getElementById, showElement, hideElement, addEventListener } from '../../utils/dom-helpers.js';
import { formatCurrency, formatPercentage, formatNumber, formatDate } from '../../utils/formatters.js';

export class PerformanceChart {
    constructor(services) {
        this.services = services;
        this.isInitialized = false;
        this.eventListeners = [];

        // Chart instances
        this.charts = new Map();

        // Chart configuration
        this.defaultOptions = {
            chartType: 'line', // 'line', 'area', 'bar', 'candlestick'
            timePeriod: '30d', // '1d', '7d', '30d', '90d', '1y', 'all'
            showVolume: false,
            showGrid: true,
            showTooltip: true,
            animated: true,
            responsive: true,
            height: 400,
            colors: {
                positive: '#10b981',
                negative: '#ef4444',
                neutral: '#6b7280',
                grid: '#e5e7eb',
                background: '#ffffff'
            }
        };

        // Chart data
        this.chartData = {
            labels: [],
            datasets: [],
            timePeriod: '30d',
            lastUpdate: null
        };

        // Time period configurations
        this.timePeriods = {
            '1d': { label: '1 Day', hours: 24, interval: '1h' },
            '7d': { label: '7 Days', hours: 168, interval: '4h' },
            '30d': { label: '30 Days', hours: 720, interval: '1d' },
            '90d': { label: '90 Days', hours: 2160, interval: '1d' },
            '1y': { label: '1 Year', hours: 8760, interval: '1w' },
            'all': { label: 'All Time', hours: null, interval: '1w' }
        };
    }

    /**
     * Initialize the performance chart component
     * @param {Object} options - Configuration options
     */
    init(options = {}) {
        if (this.isInitialized) {
            console.log('PerformanceChart already initialized');
            return;
        }

        try {
            // Check for required services
            if (!this.services.portfolioService) {
                console.error('PerformanceChart requires portfolioService');
                return;
            }

            // Merge options
            this.defaultOptions = { ...this.defaultOptions, ...options };

            // Enhance existing charts
            this.enhanceExistingCharts();

            // Set up global event listeners
            this.setupEventListeners();

            this.isInitialized = true;
            console.log('PerformanceChart initialized successfully');

        } catch (error) {
            console.error('Failed to initialize performance chart:', error);
        }
    }

    /**
     * Enhance existing chart elements in the DOM
     */
    enhanceExistingCharts() {
        const existingCharts = document.querySelectorAll('[data-performance-chart], .performance-chart');
        existingCharts.forEach(chart => {
            if (!chart.dataset.chartEnhanced) {
                this.enhanceChart(chart);
            }
        });
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Listen for portfolio updates
        if (this.services.portfolioService.onPortfolioUpdate) {
            this.services.portfolioService.onPortfolioUpdate(() => {
                this.refreshAllCharts();
            });
        }

        // Window resize handler for responsive charts
        const resizeHandler = () => {
            this.resizeAllCharts();
        };

        const cleanup = addEventListener(window, 'resize', resizeHandler);
        this.eventListeners.push(cleanup);
    }

    /**
     * Create a new performance chart
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Chart options
     * @returns {string} Chart ID
     */
    create(container, options = {}) {
        if (!container) {
            console.error('Container element is required for performance chart');
            return null;
        }

        const chartOptions = { ...this.defaultOptions, ...options };
        const chartId = this.generateChartId();

        // Set up container
        this.setupChartContainer(container, chartOptions);

        // Create chart structure
        this.createChartStructure(container, chartId);

        // Set up event listeners
        this.setupChartEventListeners(container, chartId);

        // Store chart instance
        this.charts.set(chartId, {
            container: container,
            options: chartOptions,
            data: null,
            canvas: null,
            context: null
        });

        container.dataset.chartId = chartId;

        // Load initial data
        this.loadChartData(chartId);

        return chartId;
    }

    /**
     * Enhance an existing chart element
     * @param {HTMLElement} container - Chart container element
     * @param {Object} options - Enhancement options
     */
    enhanceChart(container, options = {}) {
        if (!container || container.dataset.chartEnhanced) return;

        // Extract options from data attributes
        const chartType = container.dataset.chartType || 'line';
        const timePeriod = container.dataset.timePeriod || '30d';
        const height = parseInt(container.dataset.height) || 400;

        const chartOptions = {
            chartType,
            timePeriod,
            height,
            ...options
        };

        const chartId = this.create(container, chartOptions);
        container.dataset.chartEnhanced = 'true';

        return chartId;
    }

    /**
     * Set up chart container
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Chart options
     */
    setupChartContainer(container, options) {
        container.classList.add('performance-chart-container');
        container.style.height = `${options.height}px`;

        if (options.responsive) {
            container.classList.add('responsive');
        }
    }

    /**
     * Create chart HTML structure
     * @param {HTMLElement} container - Container element
     * @param {string} chartId - Chart ID
     */
    createChartStructure(container, chartId) {
        const structure = `
            <div class="chart-header">
                <div class="chart-title">
                    <h3>Portfolio Performance</h3>
                    <div class="chart-summary" id="chartSummary-${chartId}">
                        <span class="current-value">--</span>
                        <span class="change-value">--</span>
                    </div>
                </div>
                <div class="chart-controls">
                    <div class="time-period-selector">
                        ${this.renderTimePeriodButtons(chartId)}
                    </div>
                    <div class="chart-type-selector">
                        ${this.renderChartTypeButtons(chartId)}
                    </div>
                </div>
            </div>
            <div class="chart-content">
                <canvas id="chartCanvas-${chartId}" class="chart-canvas"></canvas>
                <div class="chart-tooltip" id="chartTooltip-${chartId}" style="display: none;"></div>
                <div class="chart-loading" id="chartLoading-${chartId}">
                    <div class="loading-spinner"></div>
                    <span>Loading chart data...</span>
                </div>
                <div class="chart-error" id="chartError-${chartId}" style="display: none;">
                    <span class="error-message">Failed to load chart data</span>
                    <button class="btn btn-sm chart-retry-btn" data-chart-id="${chartId}">Retry</button>
                </div>
            </div>
            <div class="chart-legend" id="chartLegend-${chartId}"></div>
        `;

        container.innerHTML = structure;
    }

    /**
     * Render time period buttons
     * @param {string} chartId - Chart ID
     * @returns {string} HTML for time period buttons
     */
    renderTimePeriodButtons(chartId) {
        let buttons = '';
        Object.entries(this.timePeriods).forEach(([period, config]) => {
            const activeClass = period === '30d' ? 'active' : '';
            buttons += `
                <button class="btn btn-sm time-period-btn ${activeClass}"
                        data-chart-id="${chartId}"
                        data-period="${period}">
                    ${config.label}
                </button>
            `;
        });
        return buttons;
    }

    /**
     * Render chart type buttons
     * @param {string} chartId - Chart ID
     * @returns {string} HTML for chart type buttons
     */
    renderChartTypeButtons(chartId) {
        const chartTypes = [
            { type: 'line', label: 'Line', icon: '📈' },
            { type: 'area', label: 'Area', icon: '📊' },
            { type: 'bar', label: 'Bar', icon: '📊' },
        ];

        let buttons = '';
        chartTypes.forEach(({ type, label, icon }) => {
            const activeClass = type === 'line' ? 'active' : '';
            buttons += `
                <button class="btn btn-sm chart-type-btn ${activeClass}"
                        data-chart-id="${chartId}"
                        data-type="${type}"
                        title="${label}">
                    ${icon}
                </button>
            `;
        });
        return buttons;
    }

    /**
     * Set up chart event listeners
     * @param {HTMLElement} container - Container element
     * @param {string} chartId - Chart ID
     */
    setupChartEventListeners(container, chartId) {
        // Time period buttons
        const periodButtons = container.querySelectorAll('.time-period-btn');
        periodButtons.forEach(button => {
            const cleanup = addEventListener(button, 'click', () => {
                this.setTimePeriod(chartId, button.dataset.period);
            });
            this.eventListeners.push(cleanup);
        });

        // Chart type buttons
        const typeButtons = container.querySelectorAll('.chart-type-btn');
        typeButtons.forEach(button => {
            const cleanup = addEventListener(button, 'click', () => {
                this.setChartType(chartId, button.dataset.type);
            });
            this.eventListeners.push(cleanup);
        });

        // Retry button
        const retryButton = container.querySelector('.chart-retry-btn');
        if (retryButton) {
            const cleanup = addEventListener(retryButton, 'click', () => {
                this.loadChartData(chartId);
            });
            this.eventListeners.push(cleanup);
        }

        // Canvas interactions
        const canvas = container.querySelector('.chart-canvas');
        if (canvas) {
            this.setupCanvasInteractions(canvas, chartId);
        }
    }

    /**
     * Set up canvas interactions
     * @param {HTMLElement} canvas - Canvas element
     * @param {string} chartId - Chart ID
     */
    setupCanvasInteractions(canvas, chartId) {
        const chartData = this.charts.get(chartId);
        if (!chartData) return;

        // Mouse move for tooltip
        const mouseMoveHandler = (e) => {
            this.handleCanvasMouseMove(e, chartId);
        };

        // Mouse leave to hide tooltip
        const mouseLeaveHandler = () => {
            this.hideTooltip(chartId);
        };

        const cleanup1 = addEventListener(canvas, 'mousemove', mouseMoveHandler);
        const cleanup2 = addEventListener(canvas, 'mouseleave', mouseLeaveHandler);

        this.eventListeners.push(cleanup1, cleanup2);
    }

    /**
     * Load chart data
     * @param {string} chartId - Chart ID
     */
    async loadChartData(chartId) {
        const chartData = this.charts.get(chartId);
        if (!chartData) return;

        try {
            this.showLoadingState(chartId);

            // Get performance data from service
            const performanceData = await this.services.portfolioService?.getPerformanceHistory(
                chartData.options.timePeriod
            );

            if (performanceData) {
                chartData.data = this.processChartData(performanceData);
                this.renderChart(chartId);
                this.updateChartSummary(chartId);
            } else {
                this.showErrorState(chartId);
            }

        } catch (error) {
            console.error('Failed to load chart data:', error);
            this.showErrorState(chartId);
        } finally {
            this.hideLoadingState(chartId);
        }
    }

    /**
     * Process raw data for chart rendering
     * @param {Array} rawData - Raw performance data
     * @returns {Object} Processed chart data
     */
    processChartData(rawData) {
        if (!rawData || rawData.length === 0) {
            return { labels: [], datasets: [] };
        }

        const labels = rawData.map(point => formatDate(point.timestamp));
        const values = rawData.map(point => point.portfolio_value_sats);
        const changes = rawData.map(point => point.change_percentage || 0);

        return {
            labels: labels,
            datasets: [
                {
                    label: 'Portfolio Value',
                    data: values,
                    changes: changes,
                    borderColor: this.getDatasetColor(values),
                    backgroundColor: this.getDatasetColor(values, 0.1),
                    fill: true
                }
            ]
        };
    }

    /**
     * Get dataset color based on performance
     * @param {Array} values - Data values
     * @param {number} alpha - Alpha transparency
     * @returns {string} Color value
     */
    getDatasetColor(values, alpha = 1) {
        if (!values || values.length < 2) return this.defaultOptions.colors.neutral;

        const firstValue = values[0];
        const lastValue = values[values.length - 1];

        if (lastValue > firstValue) {
            return alpha < 1 ?
                `rgba(16, 185, 129, ${alpha})` :
                this.defaultOptions.colors.positive;
        } else if (lastValue < firstValue) {
            return alpha < 1 ?
                `rgba(239, 68, 68, ${alpha})` :
                this.defaultOptions.colors.negative;
        } else {
            return alpha < 1 ?
                `rgba(107, 114, 128, ${alpha})` :
                this.defaultOptions.colors.neutral;
        }
    }

    /**
     * Render chart on canvas
     * @param {string} chartId - Chart ID
     */
    renderChart(chartId) {
        const chartData = this.charts.get(chartId);
        if (!chartData || !chartData.data) return;

        const canvas = getElementById(`chartCanvas-${chartId}`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Set canvas size
        this.resizeCanvas(canvas);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw chart based on type
        switch (chartData.options.chartType) {
            case 'line':
                this.drawLineChart(ctx, chartData);
                break;
            case 'area':
                this.drawAreaChart(ctx, chartData);
                break;
            case 'bar':
                this.drawBarChart(ctx, chartData);
                break;
            default:
                this.drawLineChart(ctx, chartData);
        }

        // Draw grid if enabled
        if (chartData.options.showGrid) {
            this.drawGrid(ctx, chartData);
        }

        // Store context for interactions
        chartData.canvas = canvas;
        chartData.context = ctx;
    }

    /**
     * Draw line chart
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} chartData - Chart data
     */
    drawLineChart(ctx, chartData) {
        const data = chartData.data.datasets[0];
        const values = data.data;

        if (values.length === 0) return;

        const canvas = ctx.canvas;
        const padding = 40;
        const chartWidth = canvas.width - (padding * 2);
        const chartHeight = canvas.height - (padding * 2);

        // Calculate scales
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const valueRange = maxValue - minValue;

        const stepX = chartWidth / (values.length - 1);

        ctx.strokeStyle = data.borderColor;
        ctx.lineWidth = 2;
        ctx.beginPath();

        values.forEach((value, index) => {
            const x = padding + (index * stepX);
            const y = padding + chartHeight - ((value - minValue) / valueRange * chartHeight);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    }

    /**
     * Draw area chart
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} chartData - Chart data
     */
    drawAreaChart(ctx, chartData) {
        const data = chartData.data.datasets[0];
        const values = data.data;

        if (values.length === 0) return;

        const canvas = ctx.canvas;
        const padding = 40;
        const chartWidth = canvas.width - (padding * 2);
        const chartHeight = canvas.height - (padding * 2);

        // Calculate scales
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const valueRange = maxValue - minValue;

        const stepX = chartWidth / (values.length - 1);

        // Fill area
        ctx.fillStyle = data.backgroundColor;
        ctx.beginPath();

        values.forEach((value, index) => {
            const x = padding + (index * stepX);
            const y = padding + chartHeight - ((value - minValue) / valueRange * chartHeight);

            if (index === 0) {
                ctx.moveTo(x, padding + chartHeight);
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.closePath();
        ctx.fill();

        // Draw line on top
        this.drawLineChart(ctx, chartData);
    }

    /**
     * Draw bar chart
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} chartData - Chart data
     */
    drawBarChart(ctx, chartData) {
        const data = chartData.data.datasets[0];
        const values = data.data;

        if (values.length === 0) return;

        const canvas = ctx.canvas;
        const padding = 40;
        const chartWidth = canvas.width - (padding * 2);
        const chartHeight = canvas.height - (padding * 2);

        // Calculate scales
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const valueRange = maxValue - minValue;

        const barWidth = chartWidth / values.length * 0.8;
        const barSpacing = chartWidth / values.length * 0.2;

        ctx.fillStyle = data.borderColor;

        values.forEach((value, index) => {
            const x = padding + (index * (barWidth + barSpacing));
            const barHeight = (value - minValue) / valueRange * chartHeight;
            const y = padding + chartHeight - barHeight;

            ctx.fillRect(x, y, barWidth, barHeight);
        });
    }

    /**
     * Draw grid lines
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} chartData - Chart data
     */
    drawGrid(ctx, chartData) {
        const canvas = ctx.canvas;
        const padding = 40;
        const chartWidth = canvas.width - (padding * 2);
        const chartHeight = canvas.height - (padding * 2);

        ctx.strokeStyle = this.defaultOptions.colors.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5 * i);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
        }

        // Vertical grid lines
        const data = chartData.data.datasets[0];
        const stepX = chartWidth / (data.data.length - 1);

        for (let i = 0; i < data.data.length; i += Math.ceil(data.data.length / 6)) {
            const x = padding + (i * stepX);
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, padding + chartHeight);
            ctx.stroke();
        }

        ctx.setLineDash([]);
    }

    /**
     * Resize canvas to fit container
     * @param {HTMLElement} canvas - Canvas element
     */
    resizeCanvas(canvas) {
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();

        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
    }

    /**
     * Handle canvas mouse move for tooltip
     * @param {Event} e - Mouse event
     * @param {string} chartId - Chart ID
     */
    handleCanvasMouseMove(e, chartId) {
        const chartData = this.charts.get(chartId);
        if (!chartData || !chartData.data) return;

        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find nearest data point
        const dataIndex = this.findNearestDataPoint(x, chartData);
        if (dataIndex !== -1) {
            this.showTooltip(chartId, x, y, dataIndex);
        } else {
            this.hideTooltip(chartId);
        }
    }

    /**
     * Find nearest data point for tooltip
     * @param {number} x - Mouse X position
     * @param {Object} chartData - Chart data
     * @returns {number} Data index or -1
     */
    findNearestDataPoint(x, chartData) {
        const canvas = chartData.canvas;
        const padding = 40;
        const chartWidth = canvas.width - (padding * 2);
        const dataLength = chartData.data.datasets[0].data.length;

        if (x < padding || x > padding + chartWidth) return -1;

        const stepX = chartWidth / (dataLength - 1);
        const index = Math.round((x - padding) / stepX);

        return Math.max(0, Math.min(index, dataLength - 1));
    }

    /**
     * Show tooltip
     * @param {string} chartId - Chart ID
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} dataIndex - Data index
     */
    showTooltip(chartId, x, y, dataIndex) {
        const tooltip = getElementById(`chartTooltip-${chartId}`);
        if (!tooltip) return;

        const chartData = this.charts.get(chartId);
        const data = chartData.data;
        const value = data.datasets[0].data[dataIndex];
        const label = data.labels[dataIndex];
        const change = data.datasets[0].changes[dataIndex];

        const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
        const changeIcon = change > 0 ? '↗' : change < 0 ? '↘' : '⚬';

        tooltip.innerHTML = `
            <div class="tooltip-content">
                <div class="tooltip-date">${label}</div>
                <div class="tooltip-value">${formatNumber(value)} sats</div>
                <div class="tooltip-change ${changeClass}">
                    ${changeIcon} ${formatPercentage(change)}
                </div>
            </div>
        `;

        tooltip.style.display = 'block';
        tooltip.style.left = `${x + 10}px`;
        tooltip.style.top = `${y - 10}px`;
    }

    /**
     * Hide tooltip
     * @param {string} chartId - Chart ID
     */
    hideTooltip(chartId) {
        const tooltip = getElementById(`chartTooltip-${chartId}`);
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    /**
     * Update chart summary
     * @param {string} chartId - Chart ID
     */
    updateChartSummary(chartId) {
        const chartData = this.charts.get(chartId);
        if (!chartData || !chartData.data) return;

        const summary = getElementById(`chartSummary-${chartId}`);
        if (!summary) return;

        const data = chartData.data.datasets[0];
        const values = data.data;
        const changes = data.changes;

        if (values.length === 0) return;

        const currentValue = values[values.length - 1];
        const totalChange = changes[changes.length - 1];

        const currentValueEl = summary.querySelector('.current-value');
        const changeValueEl = summary.querySelector('.change-value');

        if (currentValueEl) {
            currentValueEl.textContent = `${formatNumber(currentValue)} sats`;
        }

        if (changeValueEl) {
            const changeClass = totalChange > 0 ? 'positive' : totalChange < 0 ? 'negative' : 'neutral';
            const changeIcon = totalChange > 0 ? '↗' : totalChange < 0 ? '↘' : '⚬';

            changeValueEl.className = `change-value ${changeClass}`;
            changeValueEl.textContent = `${changeIcon} ${formatPercentage(totalChange)}`;
        }
    }

    /**
     * Set time period
     * @param {string} chartId - Chart ID
     * @param {string} period - Time period
     */
    setTimePeriod(chartId, period) {
        const chartData = this.charts.get(chartId);
        if (!chartData) return;

        chartData.options.timePeriod = period;

        // Update button states
        const container = chartData.container;
        const buttons = container.querySelectorAll('.time-period-btn');
        buttons.forEach(btn => {
            if (btn.dataset.period === period) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Reload data
        this.loadChartData(chartId);
    }

    /**
     * Set chart type
     * @param {string} chartId - Chart ID
     * @param {string} type - Chart type
     */
    setChartType(chartId, type) {
        const chartData = this.charts.get(chartId);
        if (!chartData) return;

        chartData.options.chartType = type;

        // Update button states
        const container = chartData.container;
        const buttons = container.querySelectorAll('.chart-type-btn');
        buttons.forEach(btn => {
            if (btn.dataset.type === type) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Re-render chart
        this.renderChart(chartId);
    }

    /**
     * Show loading state
     * @param {string} chartId - Chart ID
     */
    showLoadingState(chartId) {
        const loading = getElementById(`chartLoading-${chartId}`);
        const error = getElementById(`chartError-${chartId}`);

        if (loading) showElement(loading);
        if (error) hideElement(error);
    }

    /**
     * Hide loading state
     * @param {string} chartId - Chart ID
     */
    hideLoadingState(chartId) {
        const loading = getElementById(`chartLoading-${chartId}`);
        if (loading) hideElement(loading);
    }

    /**
     * Show error state
     * @param {string} chartId - Chart ID
     */
    showErrorState(chartId) {
        const error = getElementById(`chartError-${chartId}`);
        const loading = getElementById(`chartLoading-${chartId}`);

        if (error) showElement(error);
        if (loading) hideElement(loading);
    }

    /**
     * Refresh all charts
     */
    refreshAllCharts() {
        for (const chartId of this.charts.keys()) {
            this.loadChartData(chartId);
        }
    }

    /**
     * Resize all charts
     */
    resizeAllCharts() {
        for (const chartId of this.charts.keys()) {
            this.renderChart(chartId);
        }
    }

    /**
     * Generate unique chart ID
     * @returns {string} Chart ID
     */
    generateChartId() {
        return 'chart_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Remove chart
     * @param {string} chartId - Chart ID
     */
    removeChart(chartId) {
        const chartData = this.charts.get(chartId);
        if (chartData) {
            this.charts.delete(chartId);
        }
    }

    /**
     * Get chart data
     * @param {string} chartId - Chart ID
     * @returns {Object} Chart data
     */
    getChartData(chartId) {
        return this.charts.get(chartId);
    }

    /**
     * Destroy the performance chart component
     */
    destroy() {
        console.log('Destroying performance chart component');

        // Clean up event listeners
        this.eventListeners.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error cleaning up performance chart event listener:', error);
            }
        });
        this.eventListeners = [];

        // Clear chart instances
        this.charts.clear();

        // Reset state
        this.isInitialized = false;

        console.log('Performance chart component destroyed');
    }
}

// Create and export singleton instance
export const performanceChart = new PerformanceChart();

// Convenience functions
export function createPerformanceChart(container, options = {}) {
    return performanceChart.create(container, options);
}

export default performanceChart;