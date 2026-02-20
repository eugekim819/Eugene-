/**
 * Risk Manager
 *
 * Enforces hard portfolio-level constraints:
 *  1. Stop-loss:       exit positions that have lost > STOP_LOSS_PCT of entry cost
 *  2. Take-profit:     exit positions that have gained > TAKE_PROFIT_MULT × entry cost
 *  3. Position cap:    no single position > MAX_POSITION_PCT of total bankroll
 *  4. Portfolio cap:   total deployed capital ≤ MAX_PORTFOLIO_EXPOSURE of bankroll
 *  5. Category cap:    exposure in any event category ≤ MAX_CATEGORY_EXPOSURE
 *  6. Position count:  open positions ≤ MAX_POSITIONS
 */

import { CONFIG } from './config.js';

// ─── Stop-loss / Take-profit ───────────────────────────────────────────────────

/**
 * Given current market prices, identify positions that should be exited.
 *
 * @param {Array} positions   - current open positions [{ticker, side, contracts, avg_price, ...}]
 * @param {Map}   priceMap    - Map<ticker, {yes_bid, yes_ask}> with current prices
 * @returns {Array}           positions that should be closed, with reason
 */
export function getExitSignals(positions, priceMap) {
  const exits = [];
  for (const pos of positions) {
    const market = priceMap.get(pos.ticker);
    if (!market) continue;

    // Current mark price (use mid of bid/ask for our side)
    const markPrice = pos.side === 'yes'
      ? (market.yes_bid + market.yes_ask) / 2
      : (100 - (market.yes_bid + market.yes_ask) / 2);

    const entryPrice = pos.avg_price;
    const pnlPct     = (markPrice - entryPrice) / entryPrice;

    if (pnlPct <= -CONFIG.STOP_LOSS_PCT) {
      exits.push({ ...pos, reason: 'stop_loss', pnlPct, markPrice });
    } else if (markPrice >= entryPrice * CONFIG.TAKE_PROFIT_MULT) {
      exits.push({ ...pos, reason: 'take_profit', pnlPct, markPrice });
    }
  }
  return exits;
}

// ─── Portfolio Capacity Checks ────────────────────────────────────────────────

/**
 * Determines whether the portfolio has room for a new position.
 *
 * @param {object} recommendation  - output of strategy.evaluateMarket
 * @param {Array}  positions       - current open positions
 * @param {number} totalBankrollCents - total account balance (available + deployed)
 * @returns {{ allowed: boolean, reason: string|null }}
 */
export function checkCapacity(recommendation, positions, totalBankrollCents) {
  const { totalCostCents, category } = recommendation;

  // ── 1. Position count limit ──────────────────────────────────────────
  if (positions.length >= CONFIG.MAX_POSITIONS) {
    return { allowed: false, reason: `max positions reached (${CONFIG.MAX_POSITIONS})` };
  }

  // ── 2. Duplicate ticker check ────────────────────────────────────────
  const already = positions.find(p => p.ticker === recommendation.ticker);
  if (already) {
    return { allowed: false, reason: `already have position in ${recommendation.ticker}` };
  }

  // ── 3. Single-position size cap ──────────────────────────────────────
  const positionPct = totalCostCents / totalBankrollCents;
  if (positionPct > CONFIG.MAX_POSITION_PCT) {
    return {
      allowed: false,
      reason: `position size ${(positionPct*100).toFixed(1)}% > limit ${(CONFIG.MAX_POSITION_PCT*100).toFixed(1)}%`,
    };
  }

  // ── 4. Portfolio exposure cap ────────────────────────────────────────
  const deployedCents = positions.reduce((s, p) => s + p.market_value, 0);
  const projectedExposure = (deployedCents + totalCostCents) / totalBankrollCents;
  if (projectedExposure > CONFIG.MAX_PORTFOLIO_EXPOSURE) {
    return {
      allowed: false,
      reason: `portfolio exposure ${(projectedExposure*100).toFixed(1)}% > limit ${(CONFIG.MAX_PORTFOLIO_EXPOSURE*100).toFixed(1)}%`,
    };
  }

  // ── 5. Category concentration cap ────────────────────────────────────
  const categoryDeployed = positions
    .filter(p => p.category === category)
    .reduce((s, p) => s + p.market_value, 0);
  const categoryExposure = (categoryDeployed + totalCostCents) / totalBankrollCents;
  if (categoryExposure > CONFIG.MAX_CATEGORY_EXPOSURE) {
    return {
      allowed: false,
      reason: `category '${category}' exposure ${(categoryExposure*100).toFixed(1)}% > limit ${(CONFIG.MAX_CATEGORY_EXPOSURE*100).toFixed(1)}%`,
    };
  }

  return { allowed: true, reason: null };
}

// ─── Portfolio Summary ─────────────────────────────────────────────────────────

/**
 * Computes a summary of portfolio risk metrics.
 */
export function portfolioSummary(positions, availableCents, totalBankrollCents) {
  const deployedCents = positions.reduce((s, p) => s + p.market_value, 0);
  const exposurePct   = totalBankrollCents > 0 ? deployedCents / totalBankrollCents : 0;

  // Category breakdown
  const byCategory = {};
  for (const p of positions) {
    byCategory[p.category || 'Unknown'] =
      (byCategory[p.category || 'Unknown'] || 0) + p.market_value;
  }

  return {
    totalBankrollCents,
    availableCents,
    deployedCents,
    exposurePct,
    positionCount:  positions.length,
    categoryBreakdown: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, {
        cents: v,
        pct:   totalBankrollCents > 0 ? v / totalBankrollCents : 0,
      }])
    ),
  };
}
