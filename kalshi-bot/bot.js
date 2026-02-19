/**
 * Kalshi Auto-Betting Portfolio Manager — Main Bot Loop
 *
 * Run:
 *   KALSHI_API_KEY=your-key node kalshi-bot/bot.js
 *
 * Demo (no API key, fully simulated):
 *   node kalshi-bot/bot.js
 *
 * Key env vars (see config.js for full list):
 *   KALSHI_API_KEY          Your Kalshi API key
 *   KALSHI_API_BASE         API base URL (default: demo endpoint)
 *   DRY_RUN=true            Fetch real data but don't place orders
 *   SEMI_AUTO=true          Require manual confirmation per order
 *   KELLY_FRACTION=0.25     Fractional Kelly multiplier
 *   MIN_EDGE=0.03           Minimum edge (probability units) to bet
 *   MAX_POSITION_PCT=0.05   Max % of bankroll per position
 *   MAX_PORTFOLIO_EXPOSURE=0.50  Max % of bankroll deployed at once
 *   POLL_INTERVAL_MS=60000  Scan interval in milliseconds
 */

import { CONFIG, } from './config.js';
import * as api    from './kalshi-api.js';
import { evaluateMarket, rankOpportunities } from './strategy.js';
import { getExitSignals, checkCapacity, portfolioSummary } from './risk.js';
import { Portfolio } from './portfolio.js';
import * as readline from 'readline';

// ─── Logger ───────────────────────────────────────────────────────────────────

function ts() { return new Date().toISOString(); }
const log = {
  info:  (...a) => console.log(`[${ts()}] INFO `, ...a),
  warn:  (...a) => console.log(`[${ts()}] WARN `, ...a),
  error: (...a) => console.error(`[${ts()}] ERROR`, ...a),
  trade: (...a) => console.log(`[${ts()}] TRADE`, ...a),
  sep:   ()     => console.log('─'.repeat(72)),
};

// ─── Semi-auto confirmation ────────────────────────────────────────────────────

async function confirm(prompt) {
  if (!CONFIG.SEMI_AUTO) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${prompt} [y/N] `, ans => {
      rl.close();
      resolve(ans.trim().toLowerCase() === 'y');
    });
  });
}

// ─── Display helpers ──────────────────────────────────────────────────────────

function fmtCents(c) { return `$${(c / 100).toFixed(2)}`; }
function fmtPct(p)   { return `${(p * 100).toFixed(2)}%`; }

function printOpportunity(r, rank) {
  log.sep();
  console.log(`  #${rank} ${r.ticker} — ${r.title}`);
  console.log(`  Side:       ${r.side.toUpperCase()}  @  ${r.limitPrice}¢ / contract`);
  console.log(`  Contracts:  ${r.contracts}  (total cost: ${fmtCents(r.totalCostCents)})`);
  console.log(`  Your P:     ${fmtPct(r.estimatedP)}  |  Market P: ${fmtPct(r.impliedP)}`);
  console.log(`  Edge:       ${fmtPct(r.edge)}  |  EV: ${r.ev.toFixed(4)} per ¢ bet`);
  console.log(`  Raw Kelly:  ${fmtPct(r.rawKelly)}  →  Fractional: ${fmtPct(r.kellyFraction)}`);
  console.log(`  Closes in:  ${r.hoursToClose.toFixed(1)}h  |  Category: ${r.category}`);
}

function printSummary(portfolio) {
  const s = portfolio.sessionSummary();
  log.sep();
  console.log('  ── Portfolio Summary ────────────────────────────────────');
  console.log(`  Balance:       ${portfolio.formatBalance()}`);
  console.log(`  P&L:           ${fmtCents(s.pnlCents)} (${fmtPct(s.pnlPct)})`);
  console.log(`  Open positions: ${s.openPositions}`);
  console.log(`  Trades today:   ${s.totalBuys} buys, ${s.totalCloses} closes`);
  log.sep();
}

// ─── Exit Handler ─────────────────────────────────────────────────────────────

async function handleExits(portfolio, markets) {
  if (portfolio.positions.length === 0) return;

  const priceMap = new Map(markets.map(m => [m.ticker, m]));
  const exits    = getExitSignals(portfolio.positions, priceMap);

  for (const exit of exits) {
    log.warn(`Exit signal for ${exit.ticker} (${exit.reason}) — P&L: ${fmtPct(exit.pnlPct)}`);
    const ok = await confirm(`Close ${exit.ticker} [${exit.reason}]?`);
    if (ok) {
      await portfolio.close(exit, exit.reason);
      log.trade(`Closed ${exit.ticker} — ${exit.reason}`);
    }
  }
}

// ─── Entry Handler ────────────────────────────────────────────────────────────

async function handleEntries(portfolio, markets) {
  const opportunities = [];

  for (const market of markets) {
    const rec = evaluateMarket(market, portfolio.balance);
    if (!rec) continue;

    const { allowed, reason } = checkCapacity(rec, portfolio.positions, portfolio.totalBankroll);
    if (!allowed) {
      log.info(`Skip ${rec.ticker}: ${reason}`);
      continue;
    }

    opportunities.push(rec);
  }

  const ranked = rankOpportunities(opportunities);

  if (ranked.length === 0) {
    log.info('No qualifying opportunities found this cycle.');
    return;
  }

  log.info(`Found ${ranked.length} opportunity/ies.`);

  for (const [i, rec] of ranked.entries()) {
    // Re-check capacity (earlier bets may have consumed budget)
    const { allowed, reason } = checkCapacity(rec, portfolio.positions, portfolio.totalBankroll);
    if (!allowed) {
      log.info(`Skip ${rec.ticker} (capacity changed): ${reason}`);
      continue;
    }

    printOpportunity(rec, i + 1);

    const ok = await confirm(`Place order for ${rec.ticker}?`);
    if (!ok) {
      log.info(`Skipped ${rec.ticker}.`);
      continue;
    }

    try {
      const entry = await portfolio.buy(rec);
      log.trade(
        `BUY ${rec.contracts}x ${rec.ticker} ${rec.side.toUpperCase()} ` +
        `@ ${rec.limitPrice}¢ | cost ${fmtCents(rec.totalCostCents)} ` +
        `| order ${entry.order_id}`
      );
    } catch (err) {
      log.error(`Order failed for ${rec.ticker}:`, err.message);
    }
  }
}

// ─── Main Loop ─────────────────────────────────────────────────────────────────

async function cycle(portfolio) {
  log.info('── Starting scan cycle ──');

  await portfolio.refresh();
  log.info(`Balance: ${portfolio.formatBalance()} | Positions: ${portfolio.positions.length}`);

  const markets = await api.getMarkets();
  log.info(`Fetched ${markets.length} open markets.`);

  await handleExits(portfolio, markets);
  await handleEntries(portfolio, markets);

  printSummary(portfolio);
}

async function main() {
  log.sep();
  console.log('  Kalshi Auto-Betting Portfolio Manager');
  console.log(`  Mode:     ${api.isMock ? 'MOCK (no real orders)' : CONFIG.DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`  Strategy: ${CONFIG.KELLY_FRACTION * 100}% Kelly | min edge ${fmtPct(CONFIG.MIN_EDGE)}`);
  console.log(`  Limits:   max pos ${fmtPct(CONFIG.MAX_POSITION_PCT)} | portfolio ${fmtPct(CONFIG.MAX_PORTFOLIO_EXPOSURE)}`);
  console.log(`  Interval: ${CONFIG.POLL_INTERVAL_MS / 1000}s | Semi-auto: ${CONFIG.SEMI_AUTO}`);
  log.sep();

  if (!api.isMock && !CONFIG.KALSHI_API_KEY) {
    log.warn('No KALSHI_API_KEY set. Running in mock mode.');
  }

  const portfolio = new Portfolio();

  // Graceful shutdown
  process.on('SIGINT', () => {
    log.sep();
    log.info('Shutting down...');
    printSummary(portfolio);
    process.exit(0);
  });

  // Initial cycle
  await cycle(portfolio);

  // Polling loop
  if (CONFIG.POLL_INTERVAL_MS > 0) {
    log.info(`Next scan in ${CONFIG.POLL_INTERVAL_MS / 1000}s. Press Ctrl+C to stop.`);
    setInterval(async () => {
      try {
        await cycle(portfolio);
      } catch (err) {
        log.error('Cycle error:', err.message);
      }
      log.info(`Next scan in ${CONFIG.POLL_INTERVAL_MS / 1000}s.`);
    }, CONFIG.POLL_INTERVAL_MS);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
