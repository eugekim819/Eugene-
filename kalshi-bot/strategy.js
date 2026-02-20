/**
 * Betting Strategy Engine
 *
 * Core formulas for a binary prediction market where:
 *   - YES contract costs `c` cents, pays 100¢ if YES resolves.
 *   - NO  contract costs `(100-c)` cents, pays 100¢ if NO resolves.
 *
 * Kelly Criterion (YES side):
 *   b     = (100 - c) / c           ← net profit per cent risked
 *   f_yes = (100·p − c) / (100 − c) ← fraction of bankroll to bet
 *
 * Kelly Criterion (NO side):
 *   b     = c / (100 - c)
 *   f_no  = (c − 100·p) / c
 *
 * Positive f_yes → bet YES; positive f_no → bet NO.
 * Apply KELLY_FRACTION for fractional Kelly (lower variance).
 */

import { CONFIG } from './config.js';

// ─── Probability Calibration ──────────────────────────────────────────────────
//
// Prediction markets exhibit well-documented calibration biases:
//   • "Favourite-longshot bias": rare events are overpriced (gamblers overpay for
//     excitement); near-certain events are slightly underpriced.
//   • Liquidity-driven drift: thin markets can be pushed away from true probabilities.
//
// This calibration nudges raw market prices toward a slightly more accurate estimate.
// Formula: calibrated_p = α·raw_p + (1−α)·0.5  where α reflects market confidence.
//
// Without an external probability model, this is our best systematic edge.

const CALIBRATION_ALPHA = 0.92; // 1.0 = fully trust market; lower = shrink to 50%

/**
 * Calibrates the market's implied probability to remove known biases.
 * Returns estimated true probability of YES (0–1).
 *
 * @param {number} yesPriceCents  - market YES price in cents (e.g. 65)
 * @param {number} [openInterest] - used to increase confidence in liquid markets
 * @param {number} [volume]       - 24h volume (higher = more confident price)
 */
export function estimateProbability(yesPriceCents, openInterest = 0, volume = 0) {
  const rawP = yesPriceCents / 100;

  // Confidence modifier: more liquid markets get alpha closer to 1.0
  const liquidityScore = Math.min(1, (openInterest + volume / 10) / 5000);
  const alpha = CALIBRATION_ALPHA * (0.85 + 0.15 * liquidityScore);

  // Shrink toward 0.5 (maximum-entropy prior) based on alpha
  const calibratedP = alpha * rawP + (1 - alpha) * 0.5;

  // Apply favourite-longshot bias correction:
  // Markets overprice low-prob events; underprice near-certainties.
  // Bias is largest near 0 and 1, zero at 0.5.
  // Correction: shift calibratedP slightly toward 0.5 for extremes.
  const biasFactor  = 1 - 2 * Math.abs(calibratedP - 0.5); // 0 at extremes, 1 at 0.5
  const biasCorrect = calibratedP + 0.03 * (0.5 - calibratedP) * (1 - biasFactor);

  return Math.max(0.01, Math.min(0.99, biasCorrect));
}

// ─── Kelly Criterion ──────────────────────────────────────────────────────────

/**
 * Computes the Kelly fraction and EV for both YES and NO sides.
 *
 * @param {number} estimatedP   - your estimated true probability of YES (0–1)
 * @param {number} yesPriceCents - market YES ask price in cents (1–99)
 * @returns {{ side, kellyFraction, rawKelly, ev, edge, impliedP }}
 */
export function computeKelly(estimatedP, yesPriceCents) {
  const c      = yesPriceCents;
  const impliedP = c / 100;
  const p      = estimatedP;
  const q      = 1 - p;

  // YES side
  const f_yes = (100 * p - c) / (100 - c);
  const ev_yes = p * (100 - c) - q * c; // expected profit per YES contract (cents)

  // NO side
  const f_no  = (c - 100 * p) / c;
  const ev_no = q * c - p * (100 - c); // expected profit per NO contract (cents)

  const edge_yes = p - impliedP;   // positive → YES has edge
  const edge_no  = impliedP - p;   // positive → NO has edge

  // Pick the side with positive Kelly (there can be at most one)
  if (f_yes > 0 && f_yes >= f_no) {
    return {
      side:         'yes',
      rawKelly:     f_yes,
      kellyFraction: Math.min(f_yes * CONFIG.KELLY_FRACTION, CONFIG.MAX_POSITION_PCT),
      ev:           ev_yes / c,      // EV per cent spent (dimensionless)
      edge:         edge_yes,
      impliedP,
    };
  } else if (f_no > 0) {
    return {
      side:         'no',
      rawKelly:     f_no,
      kellyFraction: Math.min(f_no * CONFIG.KELLY_FRACTION, CONFIG.MAX_POSITION_PCT),
      ev:           ev_no / (100 - c),
      edge:         edge_no,
      impliedP,
    };
  }

  // No edge on either side
  return {
    side:         null,
    rawKelly:     0,
    kellyFraction: 0,
    ev:           Math.max(ev_yes / c, ev_no / (100 - c)),
    edge:         Math.max(edge_yes, edge_no),
    impliedP,
  };
}

// ─── Market Evaluation ────────────────────────────────────────────────────────

/**
 * Full evaluation of a single market.
 * Returns a recommendation object or null if market should be skipped.
 *
 * @param {object} market  - market data object from kalshi-api
 * @param {number} bankrollCents - available balance in cents
 * @returns {object|null}  recommendation
 */
export function evaluateMarket(market, bankrollCents) {
  const { ticker, title, category, yes_ask, yes_bid, open_interest, volume, close_time } = market;

  // ── Eligibility filters ────────────────────────────────────────────────
  if (!yes_ask || !yes_bid) return null;
  if (yes_ask < 2 || yes_ask > 98) return null; // near-certain outcomes

  const hoursToClose = (new Date(close_time) - Date.now()) / 3_600_000;
  if (hoursToClose < CONFIG.MIN_HOURS_TO_CLOSE) return null;
  if (hoursToClose > CONFIG.MAX_DAYS_TO_CLOSE * 24) return null;

  if ((open_interest || 0) < CONFIG.MIN_OPEN_INTEREST) return null;

  if (CONFIG.ALLOWED_CATEGORIES.length > 0 &&
      !CONFIG.ALLOWED_CATEGORIES.includes(category)) return null;

  // ── Probability & Kelly ────────────────────────────────────────────────
  const midPrice  = (yes_ask + yes_bid) / 2;
  const estimatedP = estimateProbability(midPrice, open_interest, volume);
  const kelly      = computeKelly(estimatedP, yes_ask);

  if (!kelly.side) return null;
  if (kelly.edge < CONFIG.MIN_EDGE) return null;
  if (kelly.kellyFraction <= 0) return null;

  // ── Position sizing ────────────────────────────────────────────────────
  const betCents    = Math.floor(bankrollCents * kelly.kellyFraction);
  const pricePerContract = kelly.side === 'yes' ? yes_ask : (100 - yes_bid);
  const contracts   = Math.max(1, Math.floor(betCents / pricePerContract));
  const totalCost   = contracts * pricePerContract;

  if (totalCost > bankrollCents) return null; // can't afford
  if (contracts < 1) return null;

  return {
    ticker,
    title,
    category,
    side:          kelly.side,
    contracts,
    limitPrice:    pricePerContract,
    totalCostCents: totalCost,
    estimatedP,
    impliedP:      kelly.impliedP,
    edge:          kelly.edge,
    ev:            kelly.ev,
    rawKelly:      kelly.rawKelly,
    kellyFraction: kelly.kellyFraction,
    hoursToClose,
  };
}

/**
 * Ranks a list of evaluated recommendations, best opportunities first.
 */
export function rankOpportunities(recommendations) {
  return [...recommendations].sort((a, b) => {
    // Primary: highest edge
    if (Math.abs(b.edge - a.edge) > 0.005) return b.edge - a.edge;
    // Secondary: best EV
    return b.ev - a.ev;
  });
}
