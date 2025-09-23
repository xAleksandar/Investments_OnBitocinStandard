// Centralized API endpoint definitions
// Shared between client and server for consistent endpoint management

const API_BASE = '/api';

const AUTH_ENDPOINTS = {
    SEND_MAGIC_LINK: `${API_BASE}/auth/send-magic-link`,
    VERIFY_TOKEN: `${API_BASE}/auth/verify-token`,
    LOGOUT: `${API_BASE}/auth/logout`,
    REFRESH: `${API_BASE}/auth/refresh`
};

const PORTFOLIO_ENDPOINTS = {
    GET_PORTFOLIO: `${API_BASE}/portfolio`,
    GET_ASSET_DETAILS: (symbol) => `${API_BASE}/portfolio/asset/${symbol}`,
    EXECUTE_TRADE: `${API_BASE}/portfolio/trade`,
    GET_PERFORMANCE: `${API_BASE}/portfolio/performance`,
    GET_HISTORY: `${API_BASE}/portfolio/history`
};

const ASSET_ENDPOINTS = {
    GET_ASSETS: `${API_BASE}/assets`,
    GET_ASSET_PRICE: (symbol) => `${API_BASE}/assets/${symbol}/price`,
    GET_ASSET_HISTORY: (symbol) => `${API_BASE}/assets/${symbol}/history`,
    SEARCH_ASSETS: `${API_BASE}/assets/search`
};

const TRADE_ENDPOINTS = {
    GET_TRADES: `${API_BASE}/trades`,
    CREATE_TRADE: `${API_BASE}/trades`,
    GET_TRADE_HISTORY: `${API_BASE}/trades/history`,
    CANCEL_TRADE: (tradeId) => `${API_BASE}/trades/${tradeId}/cancel`
};

const ADMIN_ENDPOINTS = {
    GET_SUGGESTIONS: `${API_BASE}/admin/suggestions`,
    UPDATE_SUGGESTION: (id) => `${API_BASE}/admin/suggestions/${id}`,
    DELETE_SUGGESTION: (id) => `${API_BASE}/admin/suggestions/${id}`,
    GET_USERS: `${API_BASE}/admin/users`,
    GET_SYSTEM_STATS: `${API_BASE}/admin/stats`
};

const PRICE_ENDPOINTS = {
    GET_CURRENT_PRICES: `${API_BASE}/prices/current`,
    GET_HISTORICAL_PRICES: `${API_BASE}/prices/historical`,
    REFRESH_PRICES: `${API_BASE}/prices/refresh`
};

const SET_FORGET_ENDPOINTS = {
    GET_PORTFOLIOS: `${API_BASE}/set-forget`,
    CREATE_PORTFOLIO: `${API_BASE}/set-forget`,
    UPDATE_PORTFOLIO: (id) => `${API_BASE}/set-forget/${id}`,
    DELETE_PORTFOLIO: (id) => `${API_BASE}/set-forget/${id}`,
    GET_REBALANCE_HISTORY: (id) => `${API_BASE}/set-forget/${id}/rebalance-history`
};

// Helper function to build endpoint URLs with query parameters
function buildEndpointUrl(baseUrl, params = {}) {
    const url = new URL(baseUrl, window?.location?.origin || 'http://localhost:3000');
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    });
    return url.pathname + url.search;
}

module.exports = {
    API_BASE,
    AUTH_ENDPOINTS,
    PORTFOLIO_ENDPOINTS,
    ASSET_ENDPOINTS,
    TRADE_ENDPOINTS,
    ADMIN_ENDPOINTS,
    PRICE_ENDPOINTS,
    SET_FORGET_ENDPOINTS,
    buildEndpointUrl
};