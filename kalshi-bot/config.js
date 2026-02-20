/**
 * Kalshi Auto-Betting Portfolio Manager
 * Configuration — all values can be overridden via environment variables
 */
export const CONFIG = {
  // ── Kalshi API ──────────────────────────────────────────────────────────
  // Production: https://trading-api.kalshi.com/trade-api/v2
  // Demo:       https://demo-api.kalshi.co/trade-api/v2
  API_BASE: process.env.KALSHI_API_BASE || 'https://trading-api.kalshi.co/trade-api/v2',
  API_KEY:  process.env.KALSHI_API_KEY  || null,

  // If no API key is set, the bot runs in MOCK mode (no real orders)
  get MOCK_MODE() { return !this.API_KEY; },

  // Set DRY_RUN=true to fetch real market data but not actually place orders
  DRY_RUN: process.env.DRY_RUN === 'true',

  // ── Strategy ─────────────────────────────────────────────────────────────
  // Minimum edge required before placing a bet (probability units, not %)
  // e.g. 0.03 means your estimated prob must beat market price by 3 pp
  MIN_EDGE: parseFloat(process.env.MIN_EDGE || '0.03'),

  // Fractional Kelly multiplier (0 < x ≤ 1).
  // Full Kelly (1.0) is mathematically optimal but has high variance.
  // Quarter-Kelly (0.25) is the practical default used by most quants.
  KELLY_FRACTION: parseFloat(process.env.KELLY_FRACTION || '0.25'),

  // Maximum fraction of bankroll to deploy in any single position
  MAX_POSITION_PCT: parseFloat(process.env.MAX_POSITION_PCT || '0.05'),

  // Maximum fraction of bankroll deployed across all open positions
  MAX_PORTFOLIO_EXPOSURE: parseFloat(process.env.MAX_PORTFOLIO_EXPOSURE || '0.50'),

  // Maximum number of concurrent open positions
  MAX_POSITIONS: parseInt(process.env.MAX_POSITIONS || '20'),

  // Maximum exposure to any single event category (to limit correlation risk)
  MAX_CATEGORY_EXPOSURE: parseFloat(process.env.MAX_CATEGORY_EXPOSURE || '0.20'),

  // ── Risk Management ──────────────────────────────────────────────────────
  // Exit a position if it has lost more than this fraction of its entry cost
  STOP_LOSS_PCT: parseFloat(process.env.STOP_LOSS_PCT || '0.50'),

  // Exit a position if it has gained more than this multiple of entry cost
  TAKE_PROFIT_MULT: parseFloat(process.env.TAKE_PROFIT_MULT || '2.0'),

  // ── Market Filtering ─────────────────────────────────────────────────────
  // Minimum market liquidity (open interest in contracts) to consider
  MIN_OPEN_INTEREST: parseInt(process.env.MIN_OPEN_INTEREST || '100'),

  // Minimum time to market resolution (hours) — avoids last-minute illiquid bets
  MIN_HOURS_TO_CLOSE: parseFloat(process.env.MIN_HOURS_TO_CLOSE || '2'),

  // Maximum time to resolution (days) — avoid capital lock-up
  MAX_DAYS_TO_CLOSE: parseFloat(process.env.MAX_DAYS_TO_CLOSE || '30'),

  // Categories to trade (empty = all). Examples: 'Politics', 'Economics', 'Sports'
  ALLOWED_CATEGORIES: process.env.ALLOWED_CATEGORIES
    ? process.env.ALLOWED_CATEGORIES.split(',').map(s => s.trim())
    : [],

  // ── Execution ────────────────────────────────────────────────────────────
  // How often the bot scans for opportunities (milliseconds)
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || '60000'),

  // How many markets to fetch per scan
  MARKETS_LIMIT: parseInt(process.env.MARKETS_LIMIT || '200'),

  // Require manual confirmation before placing each order
  SEMI_AUTO: process.env.SEMI_AUTO === 'true',
};
