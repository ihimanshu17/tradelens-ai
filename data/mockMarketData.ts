export interface MarketBar {
  index: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  dailyReturn: number; // percentage, e.g. -2.15
  gapReturn: number; // open vs prev close percentage
  volatility: number; // percentage, e.g. 15.4
  volume: number; // in millions
}

// Deterministic Pseudo-Random Number Generator (PRNG - Mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDeterministicMarketData(
  barsCount = 260,
  startYear = 2022
): MarketBar[] {
  const rng = mulberry32(1337420); // Fixed deterministic seed
  const bars: MarketBar[] = [];

  let currentPrice = startYear <= 2015 ? 8200.0 : startYear <= 2020 ? 12000.0 : 14500.0;
  const currentDate = new Date(startYear, 0, 3); // Start near beginning of startYear

  let prevClose = currentPrice;

  // Generate weekday bars in O(N) linear time
  for (let i = 0; i < barsCount; i++) {
    currentDate.setDate(currentDate.getDate() + 1);
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    const dateStr = currentDate.toISOString().split("T")[0];

    // Market regime modeling (volatility clusters and fat-tail daily shocks)
    const regimeRandom = rng();
    // Repeating multi-year volatility regime patterns
    const cyclePos = i % 252;
    const isVolatileRegime =
      (cyclePos > 40 && cyclePos < 80) ||
      (cyclePos > 140 && cyclePos < 175) ||
      (cyclePos > 210 && cyclePos < 235);
    const volBase = isVolatileRegime ? 0.022 : 0.010;

    // Daily return distribution with realistic negative skew
    const u1 = Math.max(0.0001, rng());
    const u2 = rng();
    const normalZ = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    // Add occasional sharp drops or gains
    let shock = 0;
    if (regimeRandom < 0.08) {
      shock = -(1.8 + rng() * 2.2); // -1.8% to -4.0% sharp drops
    } else if (regimeRandom > 0.94) {
      shock = 1.2 + rng() * 1.8; // +1.2% to +3.0% sharp gains
    }

    const dailyReturnPct = Number((normalZ * volBase * 100 + shock + 0.04).toFixed(2));
    const gapReturnPct = Number(((rng() - 0.5) * 0.8 + (shock < -1.5 ? -0.9 : 0)).toFixed(2));

    const open = Number((prevClose * (1 + gapReturnPct / 100)).toFixed(2));
    const close = Number((prevClose * (1 + dailyReturnPct / 100)).toFixed(2));

    const intradayMax = Math.max(open, close);
    const intradayMin = Math.min(open, close);
    const high = Number((intradayMax * (1 + rng() * 0.006)).toFixed(2));
    const low = Number((intradayMin * (1 - rng() * 0.006)).toFixed(2));

    const volatility = Number((12 + (isVolatileRegime ? 10 : 0) + Math.abs(dailyReturnPct) * 2 + rng() * 3).toFixed(1));
    const volume = Number((220 + rng() * 180 + Math.abs(dailyReturnPct) * 40).toFixed(0));

    bars.push({
      index: i,
      date: dateStr,
      open,
      high,
      low,
      close,
      dailyReturn: dailyReturnPct,
      gapReturn: gapReturnPct,
      volatility,
      volume,
    });

    prevClose = close;
  }

  return bars;
}

const datasetCache = new Map<number, MarketBar[]>();

/**
 * Returns a deterministic simulated market dataset for the specified lookback years.
 * Standard financial markets comprise ~252 trading sessions per year.
 * e.g. 10 years = 2,520 bars; 5 years = 1,260 bars; 3 years = 756 bars.
 */
export function getDeterministicMarketData(years: number): MarketBar[] {
  const validYears = Math.max(1, Math.min(20, Math.round(years)));
  if (datasetCache.has(validYears)) {
    return datasetCache.get(validYears)!;
  }
  const barsCount = validYears * 252;
  const startYear = 2025 - validYears;
  const data = generateDeterministicMarketData(barsCount, startYear);
  datasetCache.set(validYears, data);
  return data;
}

export const MOCK_NIFTY_DATA: MarketBar[] = generateDeterministicMarketData(260, 2022);

