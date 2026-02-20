/**
 * Kalshi API Client
 * Supports real API calls (with API key) and mock mode (no key needed).
 *
 * Kalshi REST API v2 docs: https://trading-api.kalshi.com/trade-api/v2/
 * Auth header: Authorization: <your-api-key>
 */

import { CONFIG } from './config.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function headers() {
  return {
    'Content-Type': 'application/json',
    'Authorization': CONFIG.API_KEY,
  };
}

async function apiGet(path, params = {}) {
  const url = new URL(`${CONFIG.API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { method: 'GET', headers: headers() });
  if (!res.ok) throw new Error(`Kalshi GET ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${CONFIG.API_BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kalshi POST ${path} → ${res.status}: ${err}`);
  }
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(`${CONFIG.API_BASE}${path}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Kalshi DELETE ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CATEGORIES = ['Economics', 'Politics', 'Finance', 'Sports', 'Science'];

function mockMarket(i) {
  const yesPrice = 20 + Math.floor(Math.random() * 60); // 20–80 cents
  const category = MOCK_CATEGORIES[i % MOCK_CATEGORIES.length];
  const daysOut  = 1 + Math.floor(Math.random() * 25);
  const closeTime = new Date(Date.now() + daysOut * 86_400_000).toISOString();
  return {
    ticker:          `MOCK-${category.toUpperCase().slice(0,3)}-${String(i).padStart(3,'0')}`,
    title:           `Mock ${category} Event #${i}`,
    category,
    status:          'open',
    yes_bid:         yesPrice - 1,
    yes_ask:         yesPrice + 1,
    last_price:      yesPrice,
    volume:          1000 + Math.floor(Math.random() * 50_000),
    open_interest:   200 + Math.floor(Math.random() * 10_000),
    close_time:      closeTime,
    liquidity:       5000 + Math.floor(Math.random() * 20_000),
  };
}

let _mockPositions = [];
let _mockBalance   = { available_balance: 10000 }; // $100.00 (in cents)
let _mockOrderId   = 1000;

// ─── Real API Calls ───────────────────────────────────────────────────────────

async function realGetBalance() {
  const data = await apiGet('/portfolio/balance');
  return { available_balance: data.balance?.available_balance ?? 0 };
}

async function realGetMarkets() {
  const data = await apiGet('/markets', {
    status: 'open',
    limit: CONFIG.MARKETS_LIMIT,
  });
  return (data.markets || []).map(m => ({
    ticker:        m.ticker,
    title:         m.title,
    category:      m.category,
    status:        m.status,
    yes_bid:       m.yes_bid,
    yes_ask:       m.yes_ask,
    last_price:    m.last_price,
    volume:        m.volume,
    open_interest: m.open_interest,
    close_time:    m.close_time,
    liquidity:     m.liquidity,
  }));
}

async function realGetPositions() {
  const data = await apiGet('/portfolio/positions');
  return (data.market_positions || []).map(p => ({
    ticker:          p.ticker,
    side:            p.side,
    contracts:       p.position,
    avg_price:       p.market_exposure / Math.max(p.position, 1),
    market_value:    p.market_exposure,
    realized_pnl:    p.realized_pnl,
    unrealized_pnl:  p.resting_orders_count, // placeholder; real PnL needs mark price
  }));
}

async function realPlaceOrder({ ticker, side, contracts, limitPrice }) {
  const body = {
    ticker,
    action:       'buy',
    side,
    type:         'limit',
    count:        contracts,
    time_in_force:'gtc',
    ...(side === 'yes'
      ? { yes_price: limitPrice }
      : { no_price:  limitPrice }),
  };
  const data = await apiPost('/portfolio/orders', body);
  return { order_id: data.order?.order_id, status: data.order?.status };
}

async function realCancelOrder(orderId) {
  return apiDelete(`/portfolio/orders/${orderId}`);
}

// ─── Mock API Calls ───────────────────────────────────────────────────────────

async function mockGetBalance() {
  return { ..._mockBalance };
}

async function mockGetMarkets() {
  return Array.from({ length: 30 }, (_, i) => mockMarket(i));
}

async function mockGetPositions() {
  return [..._mockPositions];
}

async function mockPlaceOrder({ ticker, side, contracts, limitPrice }) {
  const cost = contracts * limitPrice; // in cents
  _mockBalance.available_balance -= cost;
  const pos = {
    ticker,
    side,
    contracts,
    avg_price:    limitPrice,
    market_value: cost,
    realized_pnl: 0,
    unrealized_pnl: 0,
    order_id: `MOCK-${++_mockOrderId}`,
  };
  _mockPositions.push(pos);
  return { order_id: pos.order_id, status: 'resting' };
}

async function mockCancelOrder(orderId) {
  const idx = _mockPositions.findIndex(p => p.order_id === orderId);
  if (idx !== -1) {
    const pos = _mockPositions[idx];
    _mockBalance.available_balance += pos.market_value;
    _mockPositions.splice(idx, 1);
  }
  return { cancelled: true };
}

// ─── Public API ───────────────────────────────────────────────────────────────

const isMock = CONFIG.MOCK_MODE;

/**
 * Returns { available_balance } in cents (divide by 100 for dollars).
 */
export async function getBalance() {
  return isMock ? mockGetBalance() : realGetBalance();
}

/**
 * Returns array of open market objects.
 */
export async function getMarkets() {
  return isMock ? mockGetMarkets() : realGetMarkets();
}

/**
 * Returns array of current position objects.
 */
export async function getPositions() {
  return isMock ? mockGetPositions() : realGetPositions();
}

/**
 * Places a buy order.
 * @param {object} params
 * @param {string} params.ticker
 * @param {'yes'|'no'} params.side
 * @param {number} params.contracts  - integer number of contracts
 * @param {number} params.limitPrice - price in cents (1–99)
 */
export async function placeOrder(params) {
  if (CONFIG.DRY_RUN || isMock) {
    console.log(`[DRY-RUN/MOCK] Would place order:`, params);
    return isMock
      ? mockPlaceOrder(params)
      : { order_id: 'DRY-RUN', status: 'dry_run' };
  }
  return realPlaceOrder(params);
}

/**
 * Cancels an open order.
 */
export async function cancelOrder(orderId) {
  if (CONFIG.DRY_RUN || isMock) {
    console.log(`[DRY-RUN/MOCK] Would cancel order: ${orderId}`);
    return isMock ? mockCancelOrder(orderId) : { cancelled: true };
  }
  return realCancelOrder(orderId);
}

export { isMock };
