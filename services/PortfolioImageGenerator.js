const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { createCanvas, loadImage } = require('canvas');
const ChartDataLabels = require('chartjs-plugin-datalabels');

class PortfolioImageGenerator {
  constructor() {
    // Chart.js canvas renderer for pie charts
    this.chartRenderer = new ChartJSNodeCanvas({
      width: 400,
      height: 400,
      backgroundColour: 'transparent',
      plugins: {
        modern: ['chartjs-plugin-datalabels']
      }
    });
  }

  /**
   * Generate a shareable portfolio image
   * @param {Object} portfolioData - Portfolio performance data
   * @param {Object} imageMetadata - Image generation metadata (optional)
   * @param {Object} translations - Text translations for the image (optional)
   * @returns {Buffer} PNG image buffer
   */
  async generatePortfolioImage(portfolioData, imageMetadata = null, translations = null) {
    const width = 1200;
    const height = 630;

    // Helper function to get translated text
    const t = (key, fallback, replacements = {}) => {
      if (!translations || !translations[key]) {
        let text = fallback;
        Object.keys(replacements).forEach(replaceKey => {
          text = text.replace(`{${replaceKey}}`, replacements[replaceKey]);
        });
        return text;
      }
      let text = translations[key];
      Object.keys(replacements).forEach(replaceKey => {
        text = text.replace(`{${replaceKey}}`, replacements[replaceKey]);
      });
      return text;
    };

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
    ctx.font = 'bold 46px Arial';
    ctx.fillText(t('imageTitle', 'Bitcoin Standard Platform'), 60, 80);

    // Portfolio title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(`${t('imagePortfolioLabel', 'Portfolio')}: ${portfolioData.portfolio_name}`, 60, 130);

    // Performance metrics
    const performance = portfolioData.total_performance_percent;
    const performanceColor = performance >= 0 ? '#10b981' : '#ef4444';

    ctx.fillStyle = '#ffffff';
    ctx.font = '26px Arial';
    ctx.fillText(`${t('imagePerformanceLabel', 'Performance vs Bitcoin')}:`, 60, 180);

    ctx.fillStyle = performanceColor;
    ctx.font = 'bold 31px Arial';
    const performanceText = `${performance >= 0 ? '+' : ''}${performance.toFixed(2)}%`;
    ctx.fillText(performanceText, 60, 210);

    // Current value and days tracked on the right side
    ctx.fillStyle = '#ffffff';
    ctx.font = '23px Arial';
    const btcValue = (portfolioData.current_value_sats / 100000000).toFixed(4);
    ctx.fillText(`${t('imageCurrentValueLabel', 'Current Value')}: ${btcValue} BTC`, 400, 180);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '21px Arial';
    ctx.fillText(t('imageTrackedDaysLabel', 'Tracked for {days} days', { days: portfolioData.days_tracked }), 400, 210);

    // Generate pie chart for allocations
    const pieChart = await this.generateAllocationChart(portfolioData.allocations);

    // Draw pie chart on the right side
    const chartX = width - 450;
    const chartY = 115;
    ctx.drawImage(pieChart, chartX, chartY);

    // Asset allocation legend organized by categories
    let legendY = 250;

    // Group allocations by category
    const allocationsByCategory = {};
    portfolioData.allocations.forEach(allocation => {
      const category = this.getAssetCategory(allocation.asset_symbol);
      if (!allocationsByCategory[category]) {
        allocationsByCategory[category] = [];
      }
      allocationsByCategory[category].push(allocation);
    });

    console.log('DEBUG: All allocations:', portfolioData.allocations);
    console.log('DEBUG: Allocations by category:', allocationsByCategory);

    // Sort categories by total allocation
    const sortedCategories = Object.entries(allocationsByCategory)
      .map(([category, allocations]) => ({
        category,
        allocations: allocations.sort((a, b) => parseFloat(b.allocation_percentage) - parseFloat(a.allocation_percentage)),
        totalPercentage: allocations.reduce((sum, a) => sum + parseFloat(a.allocation_percentage), 0)
      }))
      .sort((a, b) => b.totalPercentage - a.totalPercentage);

    console.log('DEBUG: Sorted categories:', sortedCategories);

    let allocationIndex = 0;
    for (const { category, allocations } of sortedCategories) {
      console.log(`DEBUG: Processing category ${category} with ${allocations.length} items at Y position ${legendY}`);

      if (legendY > height - 100) {
        console.log(`DEBUG: Breaking due to overflow at Y ${legendY}, height limit ${height - 100}`);
        break;
      }

      // Category header
      ctx.fillStyle = '#ffb366';
      ctx.font = 'bold 30px Arial';
      const translatedCategory = t(category, category);
      ctx.fillText(translatedCategory, 60, legendY);
      legendY += 35;

      // Assets in category
      ctx.font = '27px Arial';
      for (const allocation of allocations) {
        console.log(`DEBUG: Processing asset ${allocation.asset_symbol} at Y position ${legendY}`);

        if (legendY > height - 80) {
          console.log(`DEBUG: Breaking asset loop due to overflow at Y ${legendY}, height limit ${height - 80}`);
          break;
        }

        const color = this.getAssetColor(allocation.asset_symbol, allocationIndex);

        // Color indicator (larger)
        ctx.fillStyle = color;
        ctx.fillRect(75, legendY - 14, 16, 16);

        // Asset text (larger font with full name)
        ctx.fillStyle = '#ffffff';
        const fullName = this.getAssetName(allocation.asset_symbol);
        const assetText = `${fullName}: ${parseFloat(allocation.allocation_percentage).toFixed(1)}%`;
        ctx.fillText(assetText, 100, legendY);

        console.log(`DEBUG: Rendered ${fullName} at Y ${legendY}`);

        legendY += 32;
        allocationIndex++;
      }

      legendY += 15; // Space between categories
    }

    // Footer with creation date, image generation info, and branding
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Arial';
    const createdDate = new Date(portfolioData.created_at).toLocaleDateString();
    ctx.fillText(`${t('imageCreatedLabel', 'Portfolio Created')}: ${createdDate}`, 60, height - 40);


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
          },
          datalabels: {
            display: true,
            color: '#000000',
            font: {
              size: 14,
              weight: 'bold'
            },
            // Add white stroke for better visibility on dark backgrounds
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderColor: '#ffffff',
            borderRadius: 3,
            borderWidth: 1,
            padding: {
              top: 2,
              bottom: 2,
              left: 4,
              right: 4
            },
            formatter: (value, context) => {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              const label = context.chart.data.labels[context.dataIndex];
              return percentage > 5 ? label : ''; // Only show label if slice is > 5%
            }
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
   * Get full asset name
   * @param {string} symbol - Asset symbol
   * @returns {string} Full asset name
   */
  getAssetName(symbol) {
    const assetNames = {
      'BTC': 'Bitcoin',
      'XAU': 'Gold',
      'XAG': 'Silver',
      'SPY': 'S&P 500 ETF',
      'QQQ': 'NASDAQ 100 ETF',
      'VTI': 'Total Stock Market ETF',
      'EFA': 'MSCI EAFE ETF',
      'VXUS': 'Total International Stock ETF',
      'EWU': 'United Kingdom ETF',
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'NVDA': 'NVIDIA Corporation',
      'JNJ': 'Johnson & Johnson',
      'V': 'Visa Inc.',
      'WMT': 'Walmart Inc.',
      'BRK-B': 'Berkshire Hathaway',
      'VNQ': 'Real Estate Investment Trust ETF',
      'VNO': 'Vornado Realty Trust',
      'PLD': 'Prologis Inc.',
      'EQIX': 'Equinix Inc.',
      'TLT': '20+ Year Treasury Bond ETF',
      'HYG': 'High Yield Corporate Bond ETF',
      'WTI': 'Crude Oil',
      'WEAT': 'Wheat ETF',
      'CPER': 'Copper ETF',
      'DBA': 'Agriculture ETF',
      'UNG': 'Natural Gas ETF',
      'URA': 'Uranium ETF'
    };

    return assetNames[symbol] || symbol;
  }

  /**
   * Get asset category for organization
   * @param {string} symbol - Asset symbol
   * @returns {string} Category name
   */
  getAssetCategory(symbol) {
    const categories = {
      // Cryptocurrencies
      'BTC': 'Crypto',

      // Precious Metals
      'XAU': 'Precious Metals',
      'XAG': 'Precious Metals',

      // Stock Indices
      'SPY': 'Stock Indices',
      'QQQ': 'Stock Indices',
      'VTI': 'Stock Indices',
      'EFA': 'International Stocks',
      'VXUS': 'International Stocks',
      'EWU': 'International Stocks',

      // Individual Stocks
      'AAPL': 'Individual Stocks',
      'MSFT': 'Individual Stocks',
      'GOOGL': 'Individual Stocks',
      'AMZN': 'Individual Stocks',
      'TSLA': 'Individual Stocks',
      'META': 'Individual Stocks',
      'NVDA': 'Individual Stocks',
      'JNJ': 'Individual Stocks',
      'V': 'Individual Stocks',
      'WMT': 'Individual Stocks',
      'BRK-B': 'Individual Stocks',

      // Real Estate
      'VNQ': 'Real Estate',
      'VNO': 'Real Estate',
      'PLD': 'Real Estate',
      'EQIX': 'Real Estate',

      // Bonds
      'TLT': 'Bonds',
      'HYG': 'Bonds',

      // Commodities
      'WTI': 'Commodities',
      'WEAT': 'Commodities',
      'CPER': 'Commodities',
      'DBA': 'Commodities',
      'UNG': 'Commodities',
      'URA': 'Commodities'
    };

    return categories[symbol] || 'Other';
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