class BitcoinGame {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.assets = [];
        this.prices = {};

        this.init();
    }

    init() {
        // Check if we have a token from URL (magic link)
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');

        if (urlToken) {
            // Clean URL first
            window.history.replaceState({}, document.title, '/');
            this.verifyMagicLink(urlToken);
            return;
        }

        if (this.token) {
            this.showMainApp();
            this.loadData();
            // Start 30-second price auto-refresh
            this.startPriceAutoRefresh();
        } else {
            this.showLoginForm();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Auth form - always available
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.requestMagicLink();
            });
        }

        // Show username field for new users - always available
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', async () => {
                const email = document.getElementById('email').value;
                if (email) {
                    // Check if user exists
                    try {
                        const response = await fetch('/api/auth/check-user', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email })
                        });
                        const data = await response.json();

                        const usernameField = document.getElementById('usernameField');
                        if (usernameField) {
                            if (!data.exists) {
                                usernameField.style.display = 'block';
                            } else {
                                usernameField.style.display = 'none';
                            }
                        }
                    } catch (error) {
                        // If check fails, show username field to be safe
                        const usernameField = document.getElementById('usernameField');
                        if (usernameField) {
                            usernameField.style.display = 'block';
                        }
                    }
                }
            });
        }
    }

    setupMainAppEventListeners() {
        // Prevent duplicate listeners by checking if already set up
        if (this.mainAppListenersSetup) {
            return;
        }
        this.mainAppListenersSetup = true;

        // Trade form
        const tradeForm = document.getElementById('tradeForm');
        if (tradeForm) {
            tradeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.executeTrade();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Mobile logout
        const logoutBtnMobile = document.getElementById('logoutBtnMobile');
        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', () => {
                this.logout();
            });
        }

        // Update amount unit options when from asset changes
        document.getElementById('fromAsset').addEventListener('change', () => {
            this.updateAmountUnitOptions();
            this.updateAmountHelper();
        });

        // Update amount helper text
        const amountUnit = document.getElementById('amountUnit');
        if (amountUnit) {
            amountUnit.addEventListener('change', () => {
                this.updateAmountHelper();
            });
        }

        const tradeAmount = document.getElementById('tradeAmount');
        if (tradeAmount) {
            tradeAmount.addEventListener('input', () => {
                this.updateAmountHelper();
            });
        }

        // Close notification
        const closeNotification = document.getElementById('closeNotification');
        if (closeNotification) {
            closeNotification.addEventListener('click', () => {
                this.hideNotification();
            });
        }

        // Close modal
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.hideAssetModal();
            });
        }

        // Close modal on backdrop click
        const assetModal = document.getElementById('assetModal');
        if (assetModal) {
            assetModal.addEventListener('click', (e) => {
                if (e.target.id === 'assetModal') {
                    this.hideAssetModal();
                }
            });
        }

        // Setup custom dropdowns for mobile
        this.setupCustomDropdowns();
    }

    setupCustomDropdowns() {
        // Setup basic dropdown toggle functionality
        const customSelects = document.querySelectorAll('.custom-select');

        customSelects.forEach(select => {
            const trigger = select.querySelector('.custom-select-trigger');

            // Toggle dropdown
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close other dropdowns
                customSelects.forEach(otherSelect => {
                    if (otherSelect !== select) {
                        otherSelect.classList.remove('open');
                    }
                });
                select.classList.toggle('open');
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            customSelects.forEach(select => {
                select.classList.remove('open');
            });
        });
    }

    setupCustomDropdownOptions(selectElement) {
        const options = selectElement.querySelectorAll('.custom-select-option');

        // Handle option selection
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();

                // Update selected option
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                // Update trigger text
                const text = selectElement.querySelector('.custom-select-text');
                text.textContent = option.textContent;

                // Update corresponding native select
                const value = option.dataset.value;
                if (selectElement.id === 'fromAssetCustom') {
                    document.getElementById('fromAsset').value = value;
                    document.getElementById('fromAsset').dispatchEvent(new Event('change'));
                } else if (selectElement.id === 'toAssetCustom') {
                    document.getElementById('toAsset').value = value;
                } else if (selectElement.id === 'amountUnitCustom') {
                    document.getElementById('amountUnit').value = value;
                    document.getElementById('amountUnit').dispatchEvent(new Event('change'));
                }

                // Close dropdown
                selectElement.classList.remove('open');
            });
        });
    }

    async requestMagicLink() {
        const email = document.getElementById('email').value;
        const username = document.getElementById('username').value;

        try {
            const response = await fetch('/api/auth/request-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage(data.message, 'success');

                // If we have a magic link URL, show the open button
                if (data.magicLink) {
                    this.showMagicLinkButton(data.magicLink);
                }
            } else {
                this.showMessage(data.error, 'error');

                // If user not found, show the username field
                if (data.error && data.error.includes('User not found')) {
                    const usernameField = document.getElementById('usernameField');
                    if (usernameField) {
                        usernameField.style.display = 'block';
                    }
                }
            }
        } catch (error) {
            this.showMessage('Network error', 'error');
        }
    }

    showMagicLinkButton(magicLink) {
        // Find the message div (where green text appears)
        const messageDiv = document.getElementById('authMessage');
        if (!messageDiv) return;

        // Add the open button right after the message
        const buttonHtml = `
            <button
                type="button"
                onclick="window.open('${magicLink}', '_blank')"
                class="mt-2 w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
                Open Magic Link
            </button>
        `;

        // Append button to the existing message
        messageDiv.innerHTML = messageDiv.innerHTML + buttonHtml;
    }

    async verifyMagicLink(token) {
        console.log('Verifying token:', token);
        try {
            const response = await fetch(`/api/auth/verify?token=${token}`);
            const data = await response.json();

            console.log('Verification response:', response.status, data);

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));

                this.showMainApp();
                this.loadData();
                // Start 30-second price auto-refresh after successful login
                this.startPriceAutoRefresh();
            } else {
                this.showMessage(data.error, 'error');
                this.showLoginForm();
            }
        } catch (error) {
            console.error('Verification error:', error);
            this.showMessage('Verification failed', 'error');
            this.showLoginForm();
        }
    }

    async loadData() {
        await Promise.all([
            this.loadAssets(),
            this.loadPrices(),
            this.loadPortfolio(),
            this.loadTradeHistory()
        ]);

        // Initialize the amount helper after data is loaded
        this.updateAmountHelper();
    }

    async loadAssets() {
        try {
            const response = await fetch('/api/assets');
            this.assets = await response.json();
            this.populateAssetSelects();
        } catch (error) {
            console.error('Failed to load assets:', error);
        }
    }

    async loadPrices() {
        try {
            const response = await fetch('/api/assets/prices');
            const data = await response.json();

            // Check if response contains valid data
            if (data.error) {
                console.error('Server error loading prices:', data.error);
                return;
            }

            this.prices = data.pricesInSats;

            // Update Bitcoin price display with error handling
            if (data.btcPrice) {
                document.getElementById('btcPrice').textContent = `$${data.btcPrice.toLocaleString()}`;
            }
        } catch (error) {
            console.error('Failed to load prices:', error);
        }
    }

    async loadPortfolio() {
        try {
            const response = await fetch('/api/portfolio', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const data = await response.json();
            this.displayPortfolio(data);
        } catch (error) {
            console.error('Failed to load portfolio:', error);
        }
    }

    async loadTradeHistory() {
        try {
            const response = await fetch('/api/trades/history', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const trades = await response.json();
            this.displayTradeHistory(trades);
        } catch (error) {
            console.error('Failed to load trade history:', error);
        }
    }

    displayPortfolio(data) {
        const holdingsDiv = document.getElementById('holdings');
        const totalValueDiv = document.getElementById('totalValue');
        const performanceDiv = document.getElementById('performance');

        const totalSats = data.total_value_sats || 0;
        const totalBTC = (totalSats / 100000000).toFixed(8);
        totalValueDiv.textContent = `${totalBTC} BTC`;

        // Calculate and display performance
        // Performance is always measured against the initial 1 BTC starting balance
        const startingBalance = 100000000; // 1 BTC in sats
        const currentValue = data.total_value_sats || 0;

        // Performance = (current - initial) / initial * 100
        const performanceValue = ((currentValue - startingBalance) / startingBalance) * 100;
        const isPositive = performanceValue >= 0;

        // Update performance display
        performanceDiv.textContent = `${isPositive ? '+' : ''}${performanceValue.toFixed(2)}%`;

        // Update color based on performance
        const performanceParent = performanceDiv.parentElement;
        if (isPositive) {
            performanceParent.className = 'bg-green-50 p-4 rounded';
            performanceDiv.className = 'text-2xl font-bold text-green-600';
        } else {
            performanceParent.className = 'bg-red-50 p-4 rounded';
            performanceDiv.className = 'text-2xl font-bold text-red-600';
        }

        holdingsDiv.innerHTML = '';

        // Sort holdings alphabetically, but keep BTC first
        const sortedHoldings = [...data.holdings].sort((a, b) => {
            // BTC always comes first
            if (a.asset_symbol === 'BTC') return -1;
            if (b.asset_symbol === 'BTC') return 1;

            // Get asset names for comparison
            const assetA = this.assets.find(asset => asset.symbol === a.asset_symbol);
            const assetB = this.assets.find(asset => asset.symbol === b.asset_symbol);

            const nameA = assetA?.name || a.asset_symbol;
            const nameB = assetB?.name || b.asset_symbol;

            // Sort alphabetically by name
            return nameA.localeCompare(nameB);
        });

        sortedHoldings.forEach(holding => {
            const asset = this.assets.find(a => a.symbol === holding.asset_symbol);

            const holdingDiv = document.createElement('div');
            let bgClass = 'bg-gray-50';
            if (holding.lock_status === 'locked') {
                bgClass = 'bg-red-50 border-red-200';
            } else if (holding.lock_status === 'partial') {
                bgClass = 'bg-yellow-50 border-yellow-200';
            }

            holdingDiv.className = `p-3 border rounded cursor-pointer hover:bg-gray-100 ${bgClass}`;

            let displayAmount;
            if (holding.asset_symbol === 'BTC') {
                displayAmount = `${(holding.amount / 100000000).toFixed(8)} BTC`;
            } else {
                // Convert back from stored integer to actual shares
                const actualAmount = holding.amount / 100000000;
                displayAmount = `${actualAmount.toFixed(8)} ${holding.asset_symbol}`;
            }

            const currentValue = (holding.current_value_sats / 100000000).toFixed(8);
            const costBasis = (holding.cost_basis_sats / 100000000).toFixed(8);
            const pnl = holding.current_value_sats - holding.cost_basis_sats;
            const pnlBTC = (pnl / 100000000).toFixed(8);
            const pnlPercent = holding.cost_basis_sats > 0 ? ((pnl / holding.cost_basis_sats) * 100).toFixed(2) : '0.00';
            const pnlColor = pnl >= 0 ? 'text-green-600' : 'text-red-600';
            const pnlSign = pnl >= 0 ? '+' : '';

            const lastPurchaseDate = holding.last_purchase_date ? new Date(holding.last_purchase_date).toLocaleDateString() : 'Never';

            // Lock status display
            let lockDisplay = '';
            if (holding.lock_status === 'locked') {
                lockDisplay = '<div class="text-xs text-red-600 font-medium">🔒 Fully Locked</div>';
            } else if (holding.lock_status === 'partial') {
                const lockedAmount = (holding.locked_amount / 100000000).toFixed(8);
                lockDisplay = `<div class="text-xs text-yellow-600 font-medium">🔒 ${lockedAmount} Locked</div>`;
            }

            holdingDiv.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="font-semibold">${asset?.name || holding.asset_symbol}</span>
                                <div class="text-sm text-gray-600">${displayAmount}</div>
                                ${holding.purchase_count > 0 ? `<div class="text-xs text-gray-500">${holding.purchase_count} purchases • Last: ${lastPurchaseDate}</div>` : ''}
                            </div>
                            <div class="text-right">
                                <div class="font-semibold">${currentValue} BTC</div>
                                ${holding.asset_symbol !== 'BTC' ? `
                                    <div class="text-xs text-gray-500">Cost: ${costBasis} BTC</div>
                                    <div class="text-xs ${pnlColor}">${pnlSign}${pnlBTC} BTC (${pnlSign}${pnlPercent}%)</div>
                                ` : ''}
                                ${lockDisplay}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add click handler for non-BTC assets
            if (holding.asset_symbol !== 'BTC' && holding.purchase_count > 0) {
                holdingDiv.addEventListener('click', () => {
                    this.showAssetDetails(holding.asset_symbol, asset?.name || holding.asset_symbol);
                });
            }

            holdingsDiv.appendChild(holdingDiv);
        });
    }

    displayTradeHistory(trades) {
        const historyDiv = document.getElementById('tradeHistory');

        if (trades.length === 0) {
            historyDiv.innerHTML = '<p class="text-gray-500">No trades yet</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'w-full text-sm';

        table.innerHTML = `
            <thead>
                <tr class="border-b">
                    <th class="text-left p-2">Date</th>
                    <th class="text-left p-2">Sold</th>
                    <th class="text-left p-2">Bought</th>
                </tr>
            </thead>
            <tbody>
                ${trades.map(trade => {
            const fromAmount = trade.from_asset === 'BTC'
                ? (trade.from_amount / 100000000).toFixed(8) + ' BTC'
                : (trade.from_amount / 100000000).toFixed(8) + ' ' + trade.from_asset;

            const toAmount = trade.to_asset === 'BTC'
                ? (trade.to_amount / 100000000).toFixed(8) + ' BTC'
                : (trade.to_amount / 100000000).toFixed(8) + ' ' + trade.to_asset;

            return `
                        <tr class="border-b">
                            <td class="p-2">${new Date(trade.created_at).toLocaleDateString()}</td>
                            <td class="p-2 text-red-600">-${fromAmount}</td>
                            <td class="p-2 text-green-600">+${toAmount}</td>
                        </tr>
                    `;
        }).join('')}
            </tbody>
        `;

        historyDiv.innerHTML = '';
        historyDiv.appendChild(table);
    }

    populateAssetSelects() {
        const fromSelect = document.getElementById('fromAsset');
        const toSelect = document.getElementById('toAsset');

        // Check if elements exist and we have assets data
        if (!fromSelect || !toSelect || !this.assets || this.assets.length === 0) {
            return;
        }

        fromSelect.innerHTML = '';
        toSelect.innerHTML = '';

        // Sort assets to put Bitcoin first
        const sortedAssets = [...this.assets].sort((a, b) => {
            if (a.symbol === 'BTC') return -1;
            if (b.symbol === 'BTC') return 1;
            return a.name.localeCompare(b.name);
        });

        sortedAssets.forEach(asset => {
            const option1 = new Option(`${asset.name} (${asset.symbol})`, asset.symbol);
            const option2 = new Option(`${asset.name} (${asset.symbol})`, asset.symbol);

            fromSelect.appendChild(option1);
            toSelect.appendChild(option2);
        });

        // Populate custom dropdowns for mobile
        this.populateCustomDropdowns(sortedAssets);

        // Initialize unit options for the default selection
        this.updateAmountUnitOptions();
    }

    populateCustomDropdowns(sortedAssets) {
        const fromCustomOptions = document.querySelector('#fromAssetCustom .custom-select-options');
        const toCustomOptions = document.querySelector('#toAssetCustom .custom-select-options');

        if (!fromCustomOptions || !toCustomOptions) return;

        // Clear existing options
        fromCustomOptions.innerHTML = '';
        toCustomOptions.innerHTML = '';

        // Populate custom dropdowns
        sortedAssets.forEach((asset, index) => {
            const fromOption = document.createElement('div');
            fromOption.className = `custom-select-option ${index === 0 ? 'selected' : ''}`;
            fromOption.dataset.value = asset.symbol;
            fromOption.textContent = `${asset.name} (${asset.symbol})`;

            const toOption = document.createElement('div');
            toOption.className = 'custom-select-option';
            toOption.dataset.value = asset.symbol;
            toOption.textContent = `${asset.name} (${asset.symbol})`;

            fromCustomOptions.appendChild(fromOption);
            toCustomOptions.appendChild(toOption);
        });

        // Update trigger text for first option
        const fromTriggerText = document.querySelector('#fromAssetCustom .custom-select-text');
        const toTriggerText = document.querySelector('#toAssetCustom .custom-select-text');

        if (fromTriggerText && sortedAssets.length > 0) {
            fromTriggerText.textContent = `${sortedAssets[0].name} (${sortedAssets[0].symbol})`;
        }
        if (toTriggerText && sortedAssets.length > 0) {
            toTriggerText.textContent = `${sortedAssets[0].name} (${sortedAssets[0].symbol})`;
        }

        // Setup event listeners for the newly created options
        const fromCustomSelect = document.getElementById('fromAssetCustom');
        const toCustomSelect = document.getElementById('toAssetCustom');
        const amountUnitCustomSelect = document.getElementById('amountUnitCustom');

        if (fromCustomSelect) this.setupCustomDropdownOptions(fromCustomSelect);
        if (toCustomSelect) this.setupCustomDropdownOptions(toCustomSelect);
        if (amountUnitCustomSelect) this.setupCustomDropdownOptions(amountUnitCustomSelect);
    }

    updateAmountUnitOptions() {
        const fromAsset = document.getElementById('fromAsset').value;
        const unitSelect = document.getElementById('amountUnit');
        const currentValue = unitSelect.value;

        // Clear existing options
        unitSelect.innerHTML = '';

        if (fromAsset === 'BTC') {
            // When selling BTC, show BTC units
            unitSelect.innerHTML = `
                <option value="btc">BTC</option>
                <option value="msat">mSats</option>
                <option value="ksat">kSats</option>
                <option value="sat">Sats</option>
            `;
        } else {
            // When selling other assets, show the asset symbol
            unitSelect.innerHTML = `<option value="asset">${fromAsset}</option>`;
        }

        // Try to maintain the previous selection if possible
        if (fromAsset === 'BTC' && ['btc', 'msat', 'ksat', 'sat'].includes(currentValue)) {
            unitSelect.value = currentValue;
        }
    }

    updateAmountHelper() {
        const amountInput = document.getElementById('tradeAmount');
        const unitSelect = document.getElementById('amountUnit');
        const helper = document.getElementById('amountHelper');
        const fromAsset = document.getElementById('fromAsset')?.value;

        // Check if elements exist (they might not during initial load)
        if (!amountInput || !unitSelect || !helper) {
            return;
        }

        const amount = parseFloat(amountInput.value);
        const unit = unitSelect.value;

        // If no amount entered, show default conversion for 1 BTC
        if (!amount || amount <= 0) {
            helper.textContent = '1 BTC = 100 mSats = 100,000 kSats = 100,000,000 sats';
            helper.className = 'text-gray-500';
            return;
        }

        // When selling non-BTC assets, show the asset amount
        if (unit === 'asset' && fromAsset && fromAsset !== 'BTC') {
            helper.textContent = `${amount} ${fromAsset}`;
            helper.className = 'text-gray-500';
            return;
        } else {
            // BTC units
            let sats = 0;
            let btc = 0;

            switch (unit) {
                case 'btc':
                    sats = amount * 100000000;
                    helper.textContent = `${amount} BTC = ${sats.toLocaleString()} sats`;
                    break;
                case 'msat':
                    sats = amount * 1000000;
                    btc = amount / 100;
                    helper.textContent = `${amount} mSats = ${btc.toFixed(8)} BTC = ${sats.toLocaleString()} sats`;
                    break;
                case 'ksat':
                    sats = amount * 1000;
                    btc = amount / 100000;
                    helper.textContent = `${amount} kSats = ${btc.toFixed(8)} BTC = ${sats.toLocaleString()} sats`;
                    break;
                case 'sat':
                    btc = amount / 100000000;
                    helper.textContent = `${amount} sats = ${btc.toFixed(8)} BTC`;
                    break;
            }
        }

        // Calculate all conversions for BTC units
        let sats = 0;
        let btc = 0;
        let msats = 0;
        let ksats = 0;

        switch(unit) {
            case 'btc':
                btc = amount;
                msats = amount * 100;
                ksats = amount * 100000;
                sats = amount * 100000000;
                break;
            case 'msat':
                btc = amount / 100;
                msats = amount;
                ksats = amount * 1000;
                sats = amount * 1000000;
                break;
            case 'ksat':
                btc = amount / 100000;
                msats = amount / 1000;
                ksats = amount;
                sats = amount * 1000;
                break;
            case 'sat':
                btc = amount / 100000000;
                msats = amount / 1000000;
                ksats = amount / 1000;
                sats = amount;
                break;
        }

        // Check if it's below minimum (only for BTC trades)
        const MIN_TRADE_SATS = 100000;
        if (fromAsset === 'BTC' && sats < MIN_TRADE_SATS) {
            helper.textContent = `⚠️ Minimum trade: 100 kSats (${MIN_TRADE_SATS.toLocaleString()} sats)`;
            helper.className = 'text-red-600 font-medium';
            return;
        }

        // Show full conversion
        const btcStr = btc.toFixed(8).replace(/\.?0+$/, '');
        const msatStr = msats.toLocaleString();
        const ksatStr = ksats.toLocaleString();
        const satStr = sats.toLocaleString();

        helper.textContent = `${btcStr} BTC = ${msatStr} mSats = ${ksatStr} kSats = ${satStr} sats`;
        helper.className = 'text-gray-500';
    }

    async executeTrade() {
        const fromAsset = document.getElementById('fromAsset').value;
        const toAsset = document.getElementById('toAsset').value;
        const amount = parseFloat(document.getElementById('tradeAmount').value);
        const unit = document.getElementById('amountUnit').value;

        if (fromAsset === toAsset) {
            this.showNotification('Cannot trade the same asset', 'error');
            return;
        }

        if (!amount || amount <= 0) {
            this.showNotification('Please enter a valid amount', 'error');
            return;
        }

        // Convert amount to satoshis based on unit
        let tradeAmount = amount;
        if (fromAsset === 'BTC') {
            switch (unit) {
                case 'btc':
                    tradeAmount = Math.round(amount * 100000000); // BTC to sats
                    break;
                case 'msat':
                    tradeAmount = Math.round(amount * 1000000); // mSats to sats
                    break;
                case 'ksat':
                    tradeAmount = Math.round(amount * 1000); // kSats to sats
                    break;
                case 'sat':
                    tradeAmount = Math.round(amount); // Already in sats
                    break;
            }
        } else {
            // For non-BTC assets, the amount is in asset units
            if (unit === 'asset') {
                // Amount is in the asset's native units - convert to integer storage
                tradeAmount = Math.round(amount * 100000000);
            } else {
                // This shouldn't happen with the new UI, but handle it just in case
                tradeAmount = Math.round(amount * 100000000);
            }
        }

        // Check minimum trade amount (100k sats) - AFTER conversion
        const MIN_TRADE_SATS = 100000;
        if (fromAsset === 'BTC' && tradeAmount < MIN_TRADE_SATS) {
            this.showNotification(`Minimum trade amount is ${MIN_TRADE_SATS.toLocaleString()} sats (100 kSats)`, 'error');
            return;
        }

        console.log('=== TRADE REQUEST DEBUG ===');
        console.log('From Asset:', fromAsset);
        console.log('To Asset:', toAsset);
        console.log('Original Amount:', amount);
        console.log('Unit:', unit);
        console.log('Converted Amount (sats):', tradeAmount);
        console.log('Min Trade Amount:', 100000);
        console.log('Passes Min Check:', tradeAmount >= 100000);

        try {
            console.log('Sending HTTP request...');

            const response = await fetch('/api/trades', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    fromAsset,
                    toAsset,
                    amount: tradeAmount
                })
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                this.showNotification('Trade executed successfully!', 'success');
                document.getElementById('tradeForm').reset();
                this.loadData(); // Refresh data
            } else {
                this.showNotification(`Trade failed: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Trade request error:', error);
            this.showNotification(`Trade failed: ${error.message}`, 'error');
        }
    }

    showLoginForm() {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('userInfo').textContent = `Welcome, ${this.user.username}!`;

        // Also update mobile user info
        const userInfoMobile = document.getElementById('userInfoMobile');
        if (userInfoMobile) {
            userInfoMobile.textContent = `Welcome, ${this.user.username}!`;
        }

        // Ensure event listeners are set up for the main app
        this.setupMainAppEventListeners();

        // Initialize TradingView chart
        this.initTradingViewChart();
    }

    initTradingViewChart() {
        const container = document.getElementById('tradingview-widget-container');
        if (!container) return;

        // Check if chart already initialized
        if (container.querySelector('iframe')) return;

        // Create TradingView widget iframe
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.innerHTML = `
            new TradingView.widget({
                "width": "100%",
                "height": 500,
                "symbol": "BITSTAMP:BTCUSD",
                "interval": "D",
                "timezone": "Etc/UTC",
                "theme": "light",
                "style": "1",
                "locale": "en",
                "toolbar_bg": "#f1f3f6",
                "enable_publishing": false,
                "allow_symbol_change": false,
                "container_id": "tradingview-widget-container",
                "hide_side_toolbar": false,
                "studies": [],
                "show_popup_button": false,
                "popup_width": "1000",
                "popup_height": "650"
            });
        `;

        // Add TradingView library script first
        const tvScript = document.createElement('script');
        tvScript.type = 'text/javascript';
        tvScript.src = 'https://s3.tradingview.com/tv.js';
        tvScript.onload = () => {
            // After library loads, add widget configuration
            container.appendChild(script);
        };

        // Append the TradingView library script
        document.head.appendChild(tvScript);
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('authMessage');
        messageDiv.textContent = message;
        messageDiv.className = `mt-4 text-center ${type === 'error' ? 'text-red-600' : 'text-green-600'}`;
        messageDiv.classList.remove('hidden');
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const messageEl = document.getElementById('notificationMessage');
        const iconEl = document.getElementById('notificationIcon');

        messageEl.textContent = message;

        // Update styling based on type
        const container = notification.querySelector('div');
        if (type === 'success') {
            container.className = 'bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 max-w-sm';
            iconEl.textContent = '✓';
            iconEl.className = 'w-5 h-5 text-green-500';
        } else if (type === 'error') {
            container.className = 'bg-white border-l-4 border-red-500 rounded-lg shadow-lg p-4 max-w-sm';
            iconEl.textContent = '✕';
            iconEl.className = 'w-5 h-5 text-red-500';
        }

        notification.classList.remove('hidden');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    hideNotification() {
        document.getElementById('notification').classList.add('hidden');
    }

    async showAssetDetails(symbol, name) {
        try {
            const response = await fetch(`/api/portfolio/asset/${symbol}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const data = await response.json();

            document.getElementById('modalTitle').textContent = `${name} (${symbol}) Purchase History`;

            const modalContent = document.getElementById('modalContent');

            if (data.purchases.length === 0 && data.sales.length === 0) {
                modalContent.innerHTML = '<p class="text-gray-500">No transactions found for this asset.</p>';
            } else {
                let content = '';

                // Show purchases
                if (data.purchases.length > 0) {
                    content += '<h4 class="font-semibold mb-2">Individual Purchases</h4>';
                    content += '<div class="overflow-x-auto mb-4">';
                    content += '<table class="w-full text-sm">';
                    content += `
                        <thead>
                            <tr class="border-b">
                                <th class="text-left p-2">Date</th>
                                <th class="text-left p-2">Amount</th>
                                <th class="text-left p-2">BTC Spent</th>
                                <th class="text-left p-2">Status</th>
                                <th class="text-left p-2">Unlocks</th>
                            </tr>
                        </thead>
                        <tbody>
                    `;

                    data.purchases.forEach(purchase => {
                        const amount = (purchase.amount / 100000000).toFixed(8);
                        const btcSpent = (purchase.btc_spent / 100000000).toFixed(8);
                        const isLocked = purchase.is_locked;
                        const unlockDate = purchase.locked_until ? new Date(purchase.locked_until).toLocaleString() : 'N/A';

                        content += `
                            <tr class="border-b ${isLocked ? 'bg-red-50' : 'bg-green-50'}">
                                <td class="p-2">${new Date(purchase.created_at).toLocaleDateString()}</td>
                                <td class="p-2">${amount} ${symbol}</td>
                                <td class="p-2">${btcSpent} BTC</td>
                                <td class="p-2">
                                    <span class="${isLocked ? 'text-red-600' : 'text-green-600'}">
                                        ${isLocked ? '🔒 Locked' : '✅ Unlocked'}
                                    </span>
                                </td>
                                <td class="p-2 text-xs">${isLocked ? unlockDate : 'Available'}</td>
                            </tr>
                        `;
                    });

                    content += '</tbody></table></div>';
                }

                // Show sales if any
                if (data.sales.length > 0) {
                    content += '<h4 class="font-semibold mb-2">Sales History</h4>';
                    content += '<div class="overflow-x-auto">';
                    content += '<table class="w-full text-sm">';
                    content += `
                        <thead>
                            <tr class="border-b">
                                <th class="text-left p-2">Date</th>
                                <th class="text-left p-2">Sold</th>
                                <th class="text-left p-2">Received</th>
                            </tr>
                        </thead>
                        <tbody>
                    `;

                    data.sales.forEach(sale => {
                        const soldAmount = (sale.from_amount / 100000000).toFixed(8);
                        const receivedBTC = (sale.to_amount / 100000000).toFixed(8);

                        content += `
                            <tr class="border-b">
                                <td class="p-2">${new Date(sale.created_at).toLocaleDateString()}</td>
                                <td class="p-2">${soldAmount} ${symbol}</td>
                                <td class="p-2">${receivedBTC} BTC</td>
                            </tr>
                        `;
                    });

                    content += '</tbody></table></div>';
                }

                modalContent.innerHTML = content;
            }

            document.getElementById('assetModal').classList.remove('hidden');
        } catch (error) {
            console.error('Failed to load asset details:', error);
            this.showNotification('Failed to load asset details', 'error');
        }
    }

    hideAssetModal() {
        document.getElementById('assetModal').classList.add('hidden');
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = {};
        // Stop price auto-refresh when logging out
        this.stopPriceAutoRefresh();
        this.showLoginForm();
    }

    startPriceAutoRefresh() {
        // Refresh prices every 30 seconds
        this.priceRefreshInterval = setInterval(() => {
            this.loadPrices();
            // Also reload portfolio to update values with new prices
            this.loadPortfolio();
        }, 30000); // 30 seconds
    }

    stopPriceAutoRefresh() {
        if (this.priceRefreshInterval) {
            clearInterval(this.priceRefreshInterval);
            this.priceRefreshInterval = null;
        }
    }
}

// Initialize the app
new BitcoinGame();