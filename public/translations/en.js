export const translations = {
    common: {
        sats: 'sats',
        btc: 'BTC',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        search: 'Search',
        filter: 'Filter',
        sort: 'Sort by',
        date: 'Date',
        amount: 'Amount',
        price: 'Price',
        performance: 'Performance',
        total: 'Total',
        balance: 'Balance',
        available: 'Available'
    },

    navigation: {
        home: 'Home',
        assets: 'Assets',
        portfolio: 'Portfolio',
        admin: 'Admin',
        education: 'Learn',
        whyBitcoin: 'Why Bitcoin?',
        whyNotGold: 'Why Not Gold?',
        fiatExperiment: 'The Fiat Experiment',
        login: 'Login / Sign Up',
        logout: 'Logout',
        language: 'Language'
    },

    auth: {
        loginTitle: 'Login to Bitcoin Investment Game',
        enterEmail: 'Enter your email address',
        emailPlaceholder: 'your@email.com',
        sendMagicLink: 'Send Magic Link',
        magicLinkSent: 'Magic link sent! Check your email.',
        invalidEmail: 'Please enter a valid email address',
        loginError: 'Login failed. Please try again.',
        loggingIn: 'Logging in...',
        checkingAuth: 'Checking authentication...'
    },

    home: {
        title: 'Measure Everything in Bitcoin',
        subtitle: 'Start with 1 Bitcoin. Try to outperform holding BTC by trading it for traditional assets.',
        description: 'See how traditional assets perform when priced in the hardest money ever created',
        getStarted: 'Start Your Portfolio',
        learnMore: 'Learn More',
        loginPrompt: 'Login to start your Bitcoin investment journey',
        featuredAssets: 'Featured Assets',
        viewAllAssets: 'View All Assets',
        whyBitcoinStandard: 'Why the Bitcoin Standard?',
        bitcoinAsUnitAccount: 'Bitcoin as the Ultimate Unit of Account',
        bitcoinDescription: 'When you measure wealth in Bitcoin terms, you see the true opportunity cost of holding traditional assets. This game demonstrates why Bitcoin is the superior store of value and unit of measurement.',
        startTradingNow: 'Start Trading Now',
        examplePortfolioTitle: 'Example Portfolio Performance',
        portfolioDescription: 'How a traditional portfolio performs when measured in Bitcoin:',
        portfolioDisclaimer: '* Performance calculated in Bitcoin terms. Most traditional assets lose value against Bitcoin over time.',
        popularAssetsTitle: 'Popular Assets vs Bitcoin',
        currentPrice: 'Current Price:',
        goldBitcoin: 'Gold / Bitcoin',
        spBitcoin: 'S&P 500 / Bitcoin',
        appleBitcoin: 'Apple / Bitcoin',
        teslaBitcoin: 'Tesla / Bitcoin',
        realEstateBitcoin: 'Real Estate / Bitcoin',
        oilBitcoin: 'Oil / Bitcoin'
    },

    assets: {
        title: 'Available Assets',
        description: 'Trade your Bitcoin for various traditional assets and see how they perform over time.',
        assetInformation: 'Asset Information',
        selectAsset: 'Select Asset to Analyze',
        viewIn: 'View in:',
        bitcoin: 'Bitcoin',
        usd: 'USD',
        performanceMetrics: 'Performance Metrics',
        categories: {
            crypto: 'Cryptocurrency',
            stock: 'Stocks',
            commodity: 'Commodities',
            bond: 'Bonds',
            reit: 'Real Estate',
            international: 'International Markets',
            popularAssets: 'Popular Assets',
            technologyStocks: 'Technology Stocks',
            traditionalStocks: 'Traditional Stocks',
            bonds: 'Bonds',
            internationalMarkets: 'International Markets',
            realEstate: 'Real Estate',
            commodities: 'Commodities'
        },
        commodityNames: {
            gold: 'Gold',
            silver: 'Silver',
            crudeOil: 'Crude Oil',
            copper: 'Copper',
            wheat: 'Wheat',
            naturalGas: 'Natural Gas',
            uranium: 'Uranium',
            agriculture: 'Agriculture'
        },
        assetDescriptions: {
            CPER: {
                title: 'United States Copper Index Fund (CPER)',
                description: 'CPER provides exposure to copper prices through futures contracts, allowing investors to participate in copper\'s performance without physical storage. Copper is known as "Dr. Copper" for its ability to predict economic health due to its widespread use in construction, electronics, and industrial applications. This ETF makes copper investing accessible to retail investors, yet even this economically critical metal has declined significantly when priced in Bitcoin.'
            },
            WEAT: {
                title: 'Teucrium Wheat Fund (WEAT)',
                description: 'WEAT provides exposure to wheat prices through futures contracts, allowing investors to gain exposure to one of the world\'s most important food crops. Wheat feeds billions of people globally and prices are influenced by weather, geopolitics, and global demand. This ETF makes agricultural commodity investing accessible, yet despite representing essential food security, it has lost purchasing power when measured against Bitcoin.'
            },
            UNG: {
                title: 'United States Natural Gas Fund (UNG)',
                description: 'UNG provides exposure to natural gas prices through futures contracts, allowing investors to participate in this critical energy commodity. Natural gas is essential for heating, electricity generation, and industrial processes, gaining importance as a "cleaner" fossil fuel. This ETF makes energy commodity investing accessible to retail investors, yet despite natural gas\'s essential role in the energy transition, it has underperformed Bitcoin as a store of value.'
            },
            URA: {
                title: 'Global X Uranium ETF (URA)',
                description: 'URA provides exposure to companies involved in uranium mining and nuclear energy production. Uranium is essential for nuclear power generation, which provides clean, baseload electricity. With growing focus on carbon-free energy, uranium demand is expected to increase. Nuclear energy powers Bitcoin mining operations globally, yet even this critical energy commodity has lost value when priced in Bitcoin.'
            },
            DBA: {
                title: 'Invesco DB Agriculture Fund (DBA)',
                description: 'DBA tracks agricultural commodities including corn, wheat, soybeans, and sugar - the building blocks of global food systems. Agriculture feeds the world\'s population and is essential for human survival. Climate change and population growth are increasing agricultural commodity demand. Despite representing humanity\'s most basic needs, agricultural commodities have lost significant value when measured against Bitcoin.'
            },
            'EWG': {
                title: 'iShares MSCI Germany ETF (EWG)',
                description: 'EWG provides exposure to German equities, tracking the largest companies including BMW, SAP, and Siemens. Germany has Europe\'s largest economy and is known for manufacturing excellence and engineering prowess. This ETF represents German industrial strength and European economic leadership, yet even Germany\'s robust economy has seen this ETF lose substantial value when measured against Bitcoin.'
            },
            'EWJ': {
                title: 'iShares MSCI Japan ETF (EWJ)',
                description: 'EWJ provides exposure to Japanese equities, including Japan\'s largest companies like Toyota, Sony, and SoftBank. Japan has the world\'s third-largest economy and is known for technological innovation and manufacturing excellence. Japanese markets peaked in 1989 and have struggled for decades, illustrating the consequences of monetary manipulation. Bitcoin offers a stark contrast as a deflationary alternative to Japan\'s inflationary monetary policy.'
            },
            'XAG': {
                title: 'Silver (XAG)',
                description: 'Silver is both a precious metal and an industrial commodity, used in electronics, solar panels, and medical applications. Often called "poor man\'s gold," silver has monetary properties but also significant industrial demand. Silver bugs argue it\'s undervalued relative to gold, but when measured against Bitcoin, silver has lost substantial purchasing power, demonstrating Bitcoin\'s superior monetary properties.'
            },
            'WTI': {
                title: 'Crude Oil WTI (WTI)',
                description: 'West Texas Intermediate (WTI) crude oil is a key energy commodity and economic indicator. Oil powers transportation, heating, and chemical production worldwide. Countries have fought wars over oil access, and oil prices significantly impact global inflation. Despite oil\'s critical importance to the global economy, it has lost value against Bitcoin, highlighting Bitcoin\'s emergence as the superior store of value.'
            },
            'XAU': {
                title: 'Gold (XAU)',
                description: 'Gold has been humanity\'s store of value for over 5,000 years and remains the most recognized alternative to fiat currency. Central banks hold gold as reserves, and investors traditionally view it as a hedge against inflation and economic uncertainty. However, when measured against Bitcoin, gold has consistently underperformed, revealing Bitcoin\'s superior monetary properties as the ultimate store of value for the digital age.'
            },
            'SPY': {
                title: 'SPDR S&P 500 ETF (SPY)',
                description: 'SPY tracks the S&P 500 index, representing the largest 500 publicly traded companies in America. It\'s the world\'s largest and most traded ETF, with over $400 billion in assets. Often considered the benchmark for U.S. stock market performance, SPY is used by institutions and individuals as a core holding. Yet even this diversified exposure to America\'s top companies has lost significant value when priced in Bitcoin.'
            },
            'AAPL': {
                title: 'Apple Inc. (AAPL)',
                description: 'Apple is the world\'s most valuable company, known for revolutionary products like the iPhone, iPad, and Mac. With over $3 trillion in market capitalization, Apple has been many investors\' favorite "safe" technology stock. The company generates massive cash flows and has a loyal customer base globally. Despite its dominance, even Apple\'s impressive growth pales in comparison to Bitcoin\'s performance as a store of value.'
            },
            'TSLA': {
                title: 'Tesla Inc. (TSLA)',
                description: 'Tesla revolutionized the automotive industry by making electric vehicles mainstream and desirable. Led by Elon Musk, Tesla has expanded into energy storage, solar panels, and autonomous driving technology. The company famously added Bitcoin to its treasury in 2021, recognizing its superior monetary properties. Tesla represents the future of transportation, yet Bitcoin represents the future of money.'
            },
            'META': {
                title: 'Meta Platforms Inc. (META)',
                description: 'Meta (formerly Facebook) owns the world\'s largest social media platforms including Facebook, Instagram, and WhatsApp, connecting over 3 billion people globally. The company is heavily investing in the "metaverse" and virtual reality technologies. Despite controlling how billions communicate and share information, Meta\'s stock has struggled to maintain its value against Bitcoin\'s monetary superiority.'
            },
            'MSFT': {
                title: 'Microsoft Corporation (MSFT)',
                description: 'Microsoft is a global technology leader in cloud computing (Azure), productivity software (Office 365), and operating systems (Windows). The company has successfully transitioned to a subscription-based model and dominates enterprise software. With consistent revenue growth and strong fundamentals, Microsoft represents "stable" tech investing, yet it still loses purchasing power when measured in Bitcoin.'
            },
            'GOOGL': {
                title: 'Alphabet Inc. (GOOGL)',
                description: 'Alphabet is Google\'s parent company, controlling the world\'s dominant search engine and advertising platform. Google processes over 8 billion searches daily and owns YouTube, Android, and Google Cloud. The company has near-monopolistic control over internet information flow, generating massive profits from advertising. Yet even this digital dominance cannot compete with Bitcoin as a store of value.'
            },
            'AMZN': {
                title: 'Amazon.com Inc. (AMZN)',
                description: 'Amazon transformed from an online bookstore into the "everything store" and cloud computing leader (AWS). The company dominates e-commerce and provides the infrastructure powering much of the modern internet. Amazon Web Services alone generates billions in high-margin revenue. Despite revolutionizing commerce and computing, Amazon\'s stock value has declined significantly when priced in Bitcoin.'
            },
            'NVDA': {
                title: 'NVIDIA Corporation (NVDA)',
                description: 'NVIDIA designs the graphics processing units (GPUs) that power gaming, artificial intelligence, and cryptocurrency mining. The company\'s chips are essential for AI development and machine learning applications. Ironically, many NVIDIA GPUs are used to mine Bitcoin and other cryptocurrencies, yet the company\'s stock still underperforms Bitcoin as an investment.'
            },
            'BRK-B': {
                title: 'Berkshire Hathaway Inc. Class B (BRK-B)',
                description: 'Berkshire Hathaway is Warren Buffett\'s legendary investment conglomerate, often called the world\'s most successful investment vehicle. The company owns dozens of businesses and holds massive stock positions in Apple, Coca-Cola, and other blue-chip companies. Buffett has famously criticized Bitcoin, calling it "rat poison squared," yet even his proven investment strategy has underperformed Bitcoin over the past decade.'
            },
            'JNJ': {
                title: 'Johnson & Johnson (JNJ)',
                description: 'Johnson & Johnson is one of the world\'s largest healthcare companies, producing pharmaceuticals, medical devices, and consumer products. The company has paid increasing dividends for 59 consecutive years, making it a favorite among income investors. J&J represents stability and essential healthcare needs, yet even this defensive stock has lost significant value when measured against Bitcoin.'
            },
            'V': {
                title: 'Visa Inc. (V)',
                description: 'Visa operates the world\'s largest payment network, processing over 150 billion transactions annually across 200+ countries. The company earns fees on nearly every credit and debit card transaction globally, creating a near-monopolistic "tollbooth" business model. Ironically, while Visa facilitates fiat currency transactions, Bitcoin offers a superior payment network that eliminates the need for intermediaries.'
            },
            'WMT': {
                title: 'Walmart Inc. (WMT)',
                description: 'Walmart is the world\'s largest retailer, serving 230 million customers weekly across 10,500 stores in 24 countries. The company pioneered efficient supply chain management and low-cost retail operations. Walmart represents essential consumer goods and services that people need regardless of economic conditions, yet even this defensive retail giant has declined in value when priced in Bitcoin.'
            },
            'TLT': {
                title: 'iShares 20+ Year Treasury Bond ETF (TLT)',
                description: 'TLT provides exposure to U.S. Treasury bonds with 20+ year maturities, traditionally considered the "safest" investment in the world. These bonds are backed by the full faith and credit of the U.S. government and have been the go-to safe haven for institutional investors. However, when measured against Bitcoin, even the safest government bonds have lost tremendous purchasing power, highlighting the debasement of fiat currency.'
            },
            'HYG': {
                title: 'iShares iBoxx $ High Yield Corporate Bond ETF (HYG)',
                description: 'HYG tracks high-yield corporate bonds, also known as "junk bonds," from companies with lower credit ratings. These bonds offer higher interest rates to compensate for increased default risk. Professional investors use HYG for income generation and portfolio diversification. Despite offering higher yields than government bonds, HYG has still lost significant value when priced in Bitcoin.'
            },
            'EWU': {
                title: 'iShares MSCI United Kingdom ETF (EWU)',
                description: 'EWU provides exposure to large and mid-capitalization UK stocks, including giants like Shell, AstraZeneca, and ASML. This ETF tracks the performance of the UK economy and provides investors with easy access to British markets. EWU shows how even the most established international markets have significantly underperformed Bitcoin, demonstrating Bitcoin\'s global monetary superiority over traditional geographic diversification.'
            },
            'VXUS': {
                title: 'Vanguard Total International Stock ETF (VXUS)',
                description: 'VXUS provides broad exposure to international developed and emerging markets outside the United States, covering over 6,000 stocks across Europe, Asia, and other regions. This ETF is designed to provide comprehensive global diversification beyond U.S. markets. Despite representing the entire world\'s stock markets outside America, VXUS has consistently underperformed Bitcoin, proving that geographic diversification cannot compete with monetary superiority.'
            },
            'EFA': {
                title: 'iShares MSCI EAFE ETF (EFA)',
                description: 'EFA tracks large and mid-capitalization stocks in developed markets across Europe, Australasia, and the Far East (EAFE). This ETF includes major companies from Japan, UK, France, Germany, and other developed economies. EFA represents the traditional approach to international investing, yet despite covering the world\'s most established economies, it has lost substantial value when measured against Bitcoin.'
            },
            'VNO': {
                title: 'Vornado Realty Trust (VNO)',
                description: 'Vornado Realty Trust is one of the largest owners and managers of commercial real estate in the United States, with a concentrated focus on Manhattan office buildings and retail properties. The company owns premier properties in New York City, including major office towers and retail spaces. Real estate has traditionally been considered a hedge against inflation, yet VNO demonstrates how even prime Manhattan real estate has lost value when priced in Bitcoin.'
            },
            'PLD': {
                title: 'Prologis Inc. (PLD)',
                description: 'Prologis is the world\'s largest owner, operator, and developer of logistics real estate, with over 5,000 facilities across 19 countries. The company\'s warehouses and distribution centers are essential infrastructure for e-commerce and global supply chains. PLD benefits from the growth of online shopping and global trade, yet even this critical logistics infrastructure has underperformed Bitcoin as a store of value.'
            },
            'EQIX': {
                title: 'Equinix Inc. (EQIX)',
                description: 'Equinix operates the world\'s largest network of data centers, providing the digital infrastructure that powers the internet, cloud computing, and digital services. The company\'s facilities house the servers and networking equipment that enable global connectivity. Ironically, while Equinix\'s data centers power Bitcoin mining operations and cryptocurrency exchanges worldwide, the company\'s stock has still underperformed Bitcoin as an investment.'
            }
        },
        searchPlaceholder: 'Search assets...',
        noResults: 'No assets found',
        priceChange24h: '24h Change',
        marketCap: 'Market Cap',
        volume: 'Volume',
        lastUpdate: 'Last Updated',
        buyAsset: 'Buy {asset}',
        sellAsset: 'Sell {asset}',
        lockedUntil: 'Locked until {date}',
        cannotSell: 'Cannot sell (24h lock)',
        assetDetails: 'Asset Details',
        historicalPerformance: 'Historical Performance',
        about: 'About {asset}',

        descriptions: {
            BTC: 'Bitcoin - The first and most valuable cryptocurrency, representing digital sound money.',
            AAPL: 'Apple Inc. - Technology company known for consumer electronics and software.',
            TSLA: 'Tesla Inc. - Electric vehicle and clean energy company.',
            MSFT: 'Microsoft Corporation - Software and cloud computing giant.',
            GOOGL: 'Alphabet Inc. - Parent company of Google and various technology ventures.',
            AMZN: 'Amazon.com Inc. - E-commerce and cloud computing leader.',
            NVDA: 'NVIDIA Corporation - Graphics processing and AI chip manufacturer.',
            SPY: 'SPDR S&P 500 ETF - Tracks the S&P 500 index of large US companies.',
            VNQ: 'Vanguard Real Estate ETF - Invests in real estate investment trusts (REITs).',
            XAU: 'Gold - Precious metal traditionally used as a store of value.',
            XAG: 'Silver - Industrial and precious metal with monetary history.',
            WTI: 'West Texas Intermediate Crude Oil - Benchmark oil price for North America.'
        },

        tags: {
            'Traditional Store of Value': 'Traditional Store of Value',
            'Central Bank Reserve': 'Central Bank Reserve',
            'Market Benchmark': 'Market Benchmark',
            'Institutional Favorite': 'Institutional Favorite',
            'Largest Company': 'Largest Company',
            'Consumer Technology': 'Consumer Technology',
            'Electric Vehicles': 'Electric Vehicles',
            'Bitcoin Adopter': 'Bitcoin Adopter',
            'Social Media': 'Social Media',
            'Metaverse Pioneer': 'Metaverse Pioneer',
            'Cloud Computing': 'Cloud Computing',
            'Enterprise Software': 'Enterprise Software',
            'Search Engine': 'Search Engine',
            'Digital Advertising': 'Digital Advertising',
            'E-commerce': 'E-commerce',
            'Cloud Infrastructure': 'Cloud Infrastructure',
            'AI Hardware': 'AI Hardware',
            'GPU Manufacturing': 'GPU Manufacturing',
            'Warren Buffett': 'Warren Buffett',
            'Value Investing': 'Value Investing',
            'Dividend Aristocrat': 'Dividend Aristocrat',
            'Healthcare Essential': 'Healthcare Essential',
            'Payment Network': 'Payment Network',
            'Transaction Fees': 'Transaction Fees',
            'Largest Retailer': 'Largest Retailer',
            'Consumer Staples': 'Consumer Staples',
            'Government Bonds': 'Government Bonds',
            'Traditional Safe Haven': 'Traditional Safe Haven',
            'High Yield': 'High Yield',
            'Corporate Debt': 'Corporate Debt',
            'UK Market': 'UK Market',
            'European Exposure': 'European Exposure',
            'German Market': 'German Market',
            'Industrial Economy': 'Industrial Economy',
            'Japanese Market': 'Japanese Market',
            'Technology Innovation': 'Technology Innovation',
            'Global Diversification': 'Global Diversification',
            'Emerging Markets': 'Emerging Markets',
            'Developed Markets': 'Developed Markets',
            'International Blue Chips': 'International Blue Chips',
            'Real Estate': 'Real Estate',
            'Income Producing': 'Income Producing',
            'Commercial Real Estate': 'Commercial Real Estate',
            'Manhattan Properties': 'Manhattan Properties',
            'Industrial Real Estate': 'Industrial Real Estate',
            'E-commerce Infrastructure': 'E-commerce Infrastructure',
            'Data Centers': 'Data Centers',
            'Digital Infrastructure': 'Digital Infrastructure',
            'Precious Metal': 'Precious Metal',
            'Industrial Use': 'Industrial Use',
            'Energy Source': 'Energy Source',
            'Economic Indicator': 'Economic Indicator',
            'Industrial Metal': 'Industrial Metal',
            'Agricultural Exposure': 'Agricultural Exposure',
            'Food Security': 'Food Security',
            'Natural Gas': 'Natural Gas',
            'Energy Transition': 'Energy Transition',
            'Nuclear Energy': 'Nuclear Energy',
            'Clean Power': 'Clean Power',
            'Agriculture': 'Agriculture',
            'Commodity ETF': 'Commodity ETF'
        },

        categories: {
            'Commodity': 'Commodity',
            'Stock ETF': 'Stock ETF',
            'Technology Stock': 'Technology Stock',
            'Conglomerate': 'Conglomerate',
            'Healthcare Stock': 'Healthcare Stock',
            'Financial Services': 'Financial Services',
            'Retail Stock': 'Retail Stock',
            'Bond ETF': 'Bond ETF',
            'International ETF': 'International ETF',
            'REIT ETF': 'REIT ETF',
            'REIT': 'REIT',
            'Commodity ETF': 'Commodity ETF'
        },

        dropdownOptions: {
            'Germany ETF': 'Germany ETF',
            'International Stocks': 'International Stocks',
            'Developed Markets': 'Developed Markets',
            'UK Market': 'UK Market'
        },

        currentBTC: 'Current (BTC)',
        currentUSD: 'Current (USD)',
        performanceMetrics: 'Performance Metrics'
    },

    tooltips: {
        // Performance tooltips
        vsPerformance: 'vs Bitcoin Performance',
        performanceOverPeriod: 'Performance vs Bitcoin over',
        dataNotAvailable: 'Data not available for',
        period: 'period',
        netPerformance: 'Net performance',
        bitcoinGrew: 'Bitcoin grew',
        vs: 'vs',

        // Price tooltips
        currentBitcoinPrice: 'Current Bitcoin Price',
        currentPrice: 'Current %ASSET% Price'
    },

    portfolio: {
        title: 'My Portfolio',
        overview: 'Portfolio Overview',
        totalValue: 'Total Portfolio Value',
        bitcoinBalance: 'Bitcoin Balance',
        assetHoldings: 'Asset Holdings',
        tradeHistory: 'Trade History',
        performance: 'Performance vs Holding Bitcoin',
        currentValue: 'Current Value',
        costBasis: 'Cost Basis',
        profitLoss: 'Profit/Loss',
        profitLossPercent: 'P&L %',
        holdings: 'Holdings',
        noHoldings: 'No asset holdings yet',
        noTrades: 'No trades yet',
        getStartedTrading: 'Start trading to build your portfolio',
        tradingPortfolio: 'Trading Portfolio',
        setForgetPortfolio: 'Set & Forget Portfolio',
        createSetForget: 'Create Set & Forget Portfolio',
        viewSetForget: 'View Set & Forget Portfolio',
        lastUpdated: 'Last updated',
        refreshPrices: 'Refresh Prices',
        quantity: 'Quantity',
        lockedAssets: 'Locked Assets',
        availableToSell: 'Available to Sell'
    },

    trading: {
        buy: 'Buy',
        sell: 'Sell',
        trade: 'Trade',
        buyTitle: 'Buy {asset}',
        sellTitle: 'Sell {asset}',
        amount: 'Amount',
        usdAmount: 'USD Amount',
        satoshiAmount: 'Satoshi Amount',
        currentPrice: 'Current Price',
        totalCost: 'Total Cost',
        totalReceived: 'Total Received',
        availableBalance: 'Available Balance',
        insufficientFunds: 'Insufficient funds',
        confirmTrade: 'Confirm Trade',
        executeTrade: 'Execute Trade',
        tradingFee: 'Trading Fee',
        estimatedReceived: 'Estimated Received',
        priceImpact: 'Price Impact',
        slippage: 'Slippage',
        tradeSuccessful: 'Trade executed successfully!',
        tradeFailed: 'Trade failed. Please try again.',
        invalidAmount: 'Please enter a valid amount',
        amountTooSmall: 'Amount too small',
        amountTooLarge: 'Amount too large',
        assetLocked: 'This asset is locked for 24 hours after purchase',
        unlockTime: 'Unlocks at {time}',
        maxAmount: 'Max'
    },

    admin: {
        title: 'Admin Panel',
        userManagement: 'User Management',
        systemStats: 'System Statistics',
        totalUsers: 'Total Users',
        totalTrades: 'Total Trades',
        totalVolume: 'Total Volume',
        assetManagement: 'Asset Management',
        priceUpdates: 'Price Updates',
        updatePrices: 'Update Prices Now',
        systemHealth: 'System Health',
        databaseStatus: 'Database Status',
        apiStatus: 'API Status',
        lastPriceUpdate: 'Last Price Update',
        suggestions: 'User Suggestions',
        allSuggestions: 'All Suggestions',
        pendingSuggestions: 'Pending Suggestions',
        markAsRead: 'Mark as Read',
        reply: 'Reply',
        adminReply: 'Admin Reply'
    },

    suggestions: {
        title: 'Suggestions & Bug Reports',
        submitNew: 'Submit New',
        mySuggestions: 'My Suggestions',
        submitSuggestion: 'Submit Suggestion or Bug Report',
        titlePlaceholder: 'Brief title for your suggestion...',
        descriptionPlaceholder: 'Describe your suggestion or bug report in detail...',
        submit: 'Submit',
        submitting: 'Submitting...',
        submitted: 'Thank you! Your suggestion has been submitted.',
        rateLimited: 'You can submit another suggestion in {time}',
        loginRequired: 'Please login to submit suggestions',
        noSuggestions: 'No suggestions yet',
        status: {
            pending: 'Pending',
            reviewed: 'Reviewed',
            implemented: 'Implemented',
            rejected: 'Rejected'
        },
        submittedOn: 'Submitted on {date}',
        adminReply: 'Admin Reply',
        type: {
            suggestion: 'Suggestion',
            bug: 'Bug Report',
            feature: 'Feature Request',
            other: 'Other'
        }
    },

    notifications: {
        pricesUpdated: 'Asset prices updated',
        portfolioRefreshed: 'Portfolio refreshed',
        loginSuccessful: 'Login successful',
        logoutSuccessful: 'Logged out successfully',
        tradingUnavailable: 'Trading temporarily unavailable',
        connectionError: 'Connection error. Please try again.',
        sessionExpired: 'Session expired. Please login again.',
        featureComingSoon: 'Feature coming soon!',
        copied: 'Copied to clipboard',
        errorOccurred: 'An error occurred'
    },

    time: {
        now: 'now',
        seconds: 'seconds',
        minutes: 'minutes',
        hours: 'hours',
        days: 'days',
        weeks: 'weeks',
        months: 'months',
        years: 'years',
        ago: 'ago',
        in: 'in',
        second: 'second',
        minute: 'minute',
        hour: 'hour',
        day: 'day',
        week: 'week',
        month: 'month',
        year: 'year',
        oneYear: '1 Year',
        twoYears: '2 Years',
        fiveYears: '5 Years',
        tenYears: '10 Years',
        fiveYear: '5 Year',
        twentyFourHours: '24h',

        // Tooltip time periods
        twentyFourHoursAgo: '24 hours ago',
        oneYearAgo: '1 year ago',
        fiveYearsAgo: '5 years ago',
        tenYearsAgo: '10 years ago'
    },

    education: {
        title: 'Education',
        subtitle: 'Learn about Bitcoin and sound money principles',
        pages: {
            whyBitcoin: {
                title: 'Why Bitcoin?',
                subtitle: 'Understanding Bitcoin as neutral, apolitical money'
            },
            whyNotGold: {
                title: 'Why Not Gold?',
                subtitle: 'The history of the gold standard and why it won\'t return'
            },
            fiatExperiment: {
                title: 'The Fiat Experiment',
                subtitle: 'How we arrived at today\'s monetary system'
            }
        },
        backToEducation: 'Back to Education',
        tableOfContents: 'Table of Contents',
        readingTime: '{minutes} min read',
        lastUpdated: 'Last updated: {date}',
        shareArticle: 'Share Article',
        relatedTopics: 'Related Topics',
        furtherReading: 'Further Reading'
    }
};

export default translations;