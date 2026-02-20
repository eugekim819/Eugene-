/**
 * Portfolio State Manager
 *
 * Wraps the Kalshi API to maintain a local view of positions and balance,
 * and records a full trade log for performance tracking.
 */

import * as api from './kalshi-api.js';

export class Portfolio {
  constructor() {
    this.positions   = [];   // [{ticker, side, contracts, avg_price, market_value, category, ...}]
    this.balance     = 0;    // available balance in cents
    this.tradeLog    = [];   // all orders placed this session
    this.initialBankroll = 0;
  }

  /** Sync state from the Kalshi API. Call before each decision cycle. */
  async refresh() {
    const [bal, positions] = await Promise.all([
      api.getBalance(),
      api.getPositions(),
    ]);
    this.balance = bal.available_balance;
    this.positions = positions;

    if (this.initialBankroll === 0) {
      const deployed = positions.reduce((s, p) => s + (p.market_value || 0), 0);
      this.initialBankroll = this.balance + deployed;
    }
  }

  /** Total bankroll = available + all deployed capital. */
  get totalBankroll() {
    const deployed = this.positions.reduce((s, p) => s + (p.market_value || 0), 0);
    return this.balance + deployed;
  }

  /** Place a buy order and record it. */
  async buy(recommendation) {
    const { ticker, side, contracts, limitPrice, totalCostCents, category } = recommendation;

    const order = await api.placeOrder({ ticker, side, contracts, limitPrice });

    const entry = {
      ...recommendation,
      order_id:   order.order_id,
      order_status: order.status,
      opened_at:  new Date().toISOString(),
    };

    // Optimistically update local state (will be corrected on next refresh)
    this.balance -= totalCostCents;
    this.positions.push({
      ticker,
      side,
      contracts,
      avg_price:   limitPrice,
      market_value: totalCostCents,
      category:    category || 'Unknown',
      order_id:    order.order_id,
    });

    this.tradeLog.push({ type: 'BUY', ...entry });
    return entry;
  }

  /** Close a position by cancelling or placing an opposite order. */
  async close(position, reason = 'manual') {
    const { ticker, order_id } = position;

    let result;
    try {
      result = await api.cancelOrder(order_id);
    } catch {
      result = { cancelled: false };
    }

    const idx = this.positions.findIndex(p => p.ticker === ticker);
    if (idx !== -1) {
      const closed = this.positions.splice(idx, 1)[0];
      this.balance += closed.market_value; // reclaim capital (approx)
      this.tradeLog.push({
        type:       'CLOSE',
        ticker,
        side:       closed.side,
        reason,
        closed_at:  new Date().toISOString(),
        result,
      });
    }

    return result;
  }

  /** Summarise session performance. */
  sessionSummary() {
    const buys   = this.tradeLog.filter(t => t.type === 'BUY').length;
    const closes = this.tradeLog.filter(t => t.type === 'CLOSE').length;
    const pnl    = this.totalBankroll - this.initialBankroll;

    return {
      initialBankrollCents: this.initialBankroll,
      currentBankrollCents: this.totalBankroll,
      pnlCents:             pnl,
      pnlPct:               this.initialBankroll > 0 ? pnl / this.initialBankroll : 0,
      totalBuys:            buys,
      totalCloses:          closes,
      openPositions:        this.positions.length,
    };
  }

  /** Human-readable balance string. */
  formatBalance() {
    return `$${(this.balance / 100).toFixed(2)} available / $${(this.totalBankroll / 100).toFixed(2)} total`;
  }
}
