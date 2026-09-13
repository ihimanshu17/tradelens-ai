import { describe, it, expect } from "vitest";
import {
  runExperiment,
  calculateWinRate,
  calculateAverageReturn,
  calculateMedianReturn,
  calculateCumulativeReturn,
} from "@/lib/research/engine";
import { ExperimentData, Trade } from "@/types/experiment";

describe("Deterministic Research Engine", () => {
  const sampleTrades: Trade[] = [
    {
      id: "t1",
      entryIndex: 1,
      exitIndex: 6,
      entryDate: "2023-01-02",
      exitDate: "2023-01-09",
      entryPrice: 100,
      exitPrice: 102,
      grossReturn: 2.0,
      netReturn: 1.9, // 2.0 - 0.1
      isWin: true,
      holdingDays: 5,
    },
    {
      id: "t2",
      entryIndex: 10,
      exitIndex: 15,
      entryDate: "2023-01-16",
      exitDate: "2023-01-23",
      entryPrice: 100,
      exitPrice: 99,
      grossReturn: -1.0,
      netReturn: -1.1,
      isWin: false,
      holdingDays: 5,
    },
    {
      id: "t3",
      entryIndex: 20,
      exitIndex: 25,
      entryDate: "2023-01-30",
      exitDate: "2023-02-06",
      entryPrice: 100,
      exitPrice: 101.5,
      grossReturn: 1.5,
      netReturn: 1.4,
      isWin: true,
      holdingDays: 5,
    },
  ];

  it("calculates win rate deterministically", () => {
    // 2 wins out of 3 trades = 66.7%
    const winRate = calculateWinRate(sampleTrades);
    expect(winRate).toBe(66.7);
  });

  it("calculates average return deterministically", () => {
    // (1.9 - 1.1 + 1.4) / 3 = 2.2 / 3 = 0.73%
    const avg = calculateAverageReturn(sampleTrades);
    expect(avg).toBe(0.73);
  });

  it("calculates median return deterministically", () => {
    // Sorted: [-1.1, 1.4, 1.9] -> Median is 1.4
    const median = calculateMedianReturn(sampleTrades);
    expect(median).toBe(1.4);
  });

  it("calculates cumulative return using compounding", () => {
    // (1 + 0.019) * (1 - 0.011) * (1 + 0.014) = 1.019 * 0.989 * 1.014 = 1.0219... -> 2.19%
    const cum = calculateCumulativeReturn(sampleTrades);
    expect(cum).toBe(2.19);
  });

  it("handles empty trades gracefully", () => {
    expect(calculateWinRate([])).toBe(0);
    expect(calculateAverageReturn([])).toBe(0);
    expect(calculateMedianReturn([])).toBe(0);
    expect(calculateCumulativeReturn([])).toBe(0);
  });

  it("runs full experiment reproducibly on simulated dataset", () => {
    const experiment: ExperimentData = {
      market: "NIFTY",
      timeframe: "daily",
      condition: {
        type: "daily_decline",
        threshold: 2.0,
        description: "Daily decline >= 2%",
      },
      entry: {
        type: "next_open",
        description: "Buy at next trading day's open",
      },
      exit: {
        type: "holding_period",
        days: 5,
        description: "Close after 5 trading days",
      },
      holdingPeriod: 5,
      testPeriod: {
        start: "2022-01-03",
        end: "2025-01-03",
        label: "Last 3 years",
      },
      costAssumption: 0.001,
      hypothesis: "Buying NIFTY after a 2% decline produces positive short-term returns",
    };

    const result1 = runExperiment(experiment);
    const result2 = runExperiment(experiment);

    // Exact determinism check
    expect(result1.observations).toBe(result2.observations);
    expect(result1.winRate).toBe(result2.winRate);
    expect(result1.averageReturn).toBe(result2.averageReturn);
    expect(result1.cumulativeReturn).toBe(result2.cumulativeReturn);
    expect(result1.trades.length).toBe(result2.trades.length);
    expect(result1.observations).toBeGreaterThan(0);
  });
});
