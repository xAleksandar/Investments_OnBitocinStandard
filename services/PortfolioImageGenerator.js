const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { createCanvas, loadImage } = require('canvas');

class PortfolioImageGenerator {
  constructor() {
    // Chart.js canvas renderer for pie charts
    this.chartRenderer = new ChartJSNodeCanvas({
      width: 400,
      height: 400,
      backgroundColour: 'transparent'
    });
  }

  /**
   * Generate a shareable portfolio image
   * @param {Object} portfolioData - Portfolio performance data
   * @returns {Buffer} PNG image buffer
   */
  async generatePortfolioImage(portfolioData) {
    const width = 1200;
    const height = 630;

    // Create main canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#2d2d2d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Bitcoin Standard Platform branding
    ctx.fillStyle = '#f7931a';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('Bitcoin Standard Platform', 60, 80);

    // Portfolio title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`Portfolio: ${portfolioData.portfolio_name}`, 60, 130);

    // Performance metrics
    const performance = portfolioData.total_performance_percent;
    const performanceColor = performance >= 0 ? '#10b981' : '#ef4444';

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText('Performance vs Bitcoin:', 60, 180);

    ctx.fillStyle = performanceColor;
    ctx.font = 'bold 24px Arial';
    const performanceText = `${performance >= 0 ? '+' : ''}${performance.toFixed(2)}%`;
    ctx.fillText(performanceText, 60, 210);

    // Current value
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial';
    const btcValue = (portfolioData.current_value_sats / 100000000).toFixed(4);
    ctx.fillText(`Current Value: ${btcValue} BTC`, 60, 250);

    // Days tracked
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px Arial';
    ctx.fillText(`Tracked for ${portfolioData.days_tracked} days`, 60, 280);

    // Generate pie chart for allocations
    const pieChart = await this.generateAllocationChart(portfolioData.allocations);

    // Draw pie chart on the right side
    const chartX = width - 450;
    const chartY = 115;
    ctx.drawImage(pieChart, chartX, chartY);

    // Asset allocation legend
    let legendY = 340;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Asset Allocation:', 60, legendY);

    legendY += 30;
    ctx.font = '14px Arial';

    // Sort allocations by percentage for better display
    const sortedAllocations = [...portfolioData.allocations].sort(
      (a, b) => parseFloat(b.allocation_percentage) - parseFloat(a.allocation_percentage)
    );

    for (let i = 0; i < Math.min(sortedAllocations.length, 8); i++) {
      const allocation = sortedAllocations[i];
      const color = this.getAssetColor(allocation.asset_symbol, i);

      // Color indicator
      ctx.fillStyle = color;
      ctx.fillRect(60, legendY - 12, 12, 12);

      // Asset text
      ctx.fillStyle = '#ffffff';
      const assetText = `${allocation.asset_symbol}: ${parseFloat(allocation.allocation_percentage).toFixed(1)}%`;
      ctx.fillText(assetText, 80, legendY);

      legendY += 25;
      if (legendY > height - 60) break; // Don't overflow
    }

    // Footer with creation date and branding
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Arial';
    const createdDate = new Date(portfolioData.created_at).toLocaleDateString();
    ctx.fillText(`Created: ${createdDate}`, 60, height - 40);

    const shareUrl = 'bitcoinstandardplatform.com';
    const urlWidth = ctx.measureText(shareUrl).width;
    ctx.fillText(shareUrl, width - urlWidth - 60, height - 40);

    // Orange accent line at bottom
    ctx.fillStyle = '#f7931a';
    ctx.fillRect(0, height - 8, width, 8);

    return canvas.toBuffer('image/png');
  }

  /**
   * Generate pie chart for asset allocations
   * @param {Array} allocations - Array of allocation objects
   * @returns {Canvas} Canvas with pie chart
   */
  async generateAllocationChart(allocations) {
    // Prepare data for Chart.js
    const labels = allocations.map(a => a.asset_symbol);
    const data = allocations.map(a => parseFloat(a.allocation_percentage));
    const colors = allocations.map((a, i) => this.getAssetColor(a.asset_symbol, i));

    const configuration = {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#1a1a1a'
        }]
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            display: false // We'll create our own legend
          },
          tooltip: {
            enabled: false
          }
        }
      }
    };

    const chartBuffer = await this.chartRenderer.renderToBuffer(configuration);
    const chartCanvas = createCanvas(400, 400);
    const chartCtx = chartCanvas.getContext('2d');

    const chartImage = await loadImage(chartBuffer);
    chartCtx.drawImage(chartImage, 0, 0);

    return chartCanvas;
  }

  /**
   * Get color for asset based on symbol or index
   * @param {string} symbol - Asset symbol
   * @param {number} index - Index for fallback color
   * @returns {string} Hex color
   */
  getAssetColor(symbol, index) {
    const assetColors = {
      'BTC': '#f7931a',
      'XAU': '#ffd700',
      'SPY': '#4285f4',
      'QQQ': '#34a853',
      'VNQ': '#ea4335',
      'TLT': '#9333ea',
      'HYG': '#f59e0b',
      'VTI': '#06b6d4',
      'MSFT': '#0078d4',
      'AAPL': '#000000',
      'GOOGL': '#4285f4',
      'AMZN': '#ff9900',
      'TSLA': '#cc0000'
    };

    if (assetColors[symbol]) {
      return assetColors[symbol];
    }

    // Fallback color palette
    const fallbackColors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];

    return fallbackColors[index % fallbackColors.length];
  }

  /**
   * Check if image should be regenerated (daily limit)
   * @param {Date} lastGenerated - Last generation timestamp
   * @returns {boolean} Whether to regenerate
   */
  shouldRegenerateImage(lastGenerated) {
    if (!lastGenerated) return true;

    const now = new Date();
    const lastGen = new Date(lastGenerated);
    const hoursDiff = (now - lastGen) / (1000 * 60 * 60);

    return hoursDiff >= 24; // Regenerate after 24 hours
  }
}

module.exports = PortfolioImageGenerator;