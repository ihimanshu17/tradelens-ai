import { db } from "./db";
import { experiments, experimentVersions, experimentResults } from "./schema";
import { eq, desc } from "drizzle-orm";
import { Experiment, ExperimentData, ExperimentVersion, ExperimentResult } from "@/types/experiment";
import { runExperiment } from "@/lib/research/engine";

// In-Memory Fallback Store with seed data for instant prototype review
const fallbackExperiments: Experiment[] = [
  {
    id: "exp-nifty-2pct-fall",
    title: "NIFTY — 2% Fall Mean-Reversion",
    originalQuestion: "Does buying NIFTY after a 2% fall have an edge?",
    market: "NIFTY",
    timeframe: "daily",
    condition: {
      type: "daily_decline",
      threshold: 2.0,
      description: "Daily decline >= 2.0%",
    },
    entryCondition: {
      type: "next_open",
      description: "Buy at next trading day open",
    },
    exitCondition: {
      type: "holding_period",
      days: 5,
      description: "Exit after 5 trading days",
    },
    holdingPeriod: 5,
    testPeriod: {
      start: "2022-01-03",
      end: "2025-01-03",
      label: "Last 3 years (2022–2025)",
    },
    costAssumption: 0.001, // 0.10%
    hypothesis: "Buying NIFTY after a 2% daily decline produces positive short-term returns over a 5-day holding horizon.",
    status: "tested",
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "exp-nifty-3down-days",
    title: "NIFTY — 3 Consecutive Down Days",
    originalQuestion: "What happens after three consecutive down days?",
    market: "NIFTY",
    timeframe: "daily",
    condition: {
      type: "consecutive_down",
      threshold: 0,
      consecutiveDays: 3,
      description: "Three consecutive down closes",
    },
    entryCondition: {
      type: "next_open",
      description: "Buy at next trading day open",
    },
    exitCondition: {
      type: "holding_period",
      days: 5,
      description: "Exit after 5 trading days",
    },
    holdingPeriod: 5,
    testPeriod: {
      start: "2022-01-03",
      end: "2025-01-03",
      label: "Last 3 years (2022–2025)",
    },
    costAssumption: 0.001,
    hypothesis: "Market exhaustion after three consecutive down closes creates favorable mean-reversion conditions.",
    status: "tested",
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
  },
];

const fallbackVersions: Record<string, ExperimentVersion[]> = {
  "exp-nifty-2pct-fall": [
    {
      id: "v1-nifty-2pct",
      experimentId: "exp-nifty-2pct-fall",
      versionNumber: 1,
      experimentData: {
        market: "NIFTY",
        timeframe: "daily",
        condition: {
          type: "daily_decline",
          threshold: 2.0,
          description: "Daily decline >= 2.0%",
        },
        entry: {
          type: "next_open",
          description: "Buy at next trading day open",
        },
        exit: {
          type: "holding_period",
          days: 5,
          description: "Exit after 5 trading days",
        },
        holdingPeriod: 5,
        testPeriod: {
          start: "2022-01-03",
          end: "2025-01-03",
          label: "Last 3 years",
        },
        costAssumption: 0.001,
        hypothesis: "Initial 5-day holding experiment.",
      },
      changeSummary: "Initial experiment creation",
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    },
    {
      id: "v2-nifty-2pct",
      experimentId: "exp-nifty-2pct-fall",
      versionNumber: 2,
      experimentData: {
        market: "NIFTY",
        timeframe: "daily",
        condition: {
          type: "daily_decline",
          threshold: 2.0,
          description: "Daily decline >= 2.0%",
        },
        entry: {
          type: "next_open",
          description: "Buy at next trading day open",
        },
        exit: {
          type: "holding_period",
          days: 10,
          description: "Extended holding to 10 trading days",
        },
        holdingPeriod: 10,
        testPeriod: {
          start: "2022-01-03",
          end: "2025-01-03",
          label: "Last 3 years",
        },
        costAssumption: 0.001,
        hypothesis: "Testing if extending holding period to 10 days captures fuller recovery.",
      },
      changeSummary: "Changed holding period from 5 days to 10 days",
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ],
};

// Seed initial results for demo experiments
const fallbackResults: Record<string, ExperimentResult> = {};
for (const exp of fallbackExperiments) {
  const expData: ExperimentData = {
    market: exp.market,
    timeframe: exp.timeframe,
    condition: exp.condition,
    entry: exp.entryCondition,
    exit: exp.exitCondition,
    holdingPeriod: exp.holdingPeriod,
    testPeriod: exp.testPeriod,
    costAssumption: exp.costAssumption,
    hypothesis: exp.hypothesis,
  };
  const res = runExperiment(expData);
  res.experimentId = exp.id;
  fallbackResults[exp.id] = res;
}

export async function getExperiments(): Promise<Experiment[]> {
  if (db) {
    try {
      const rows = await db.select().from(experiments).orderBy(desc(experiments.createdAt));
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        originalQuestion: r.originalQuestion,
        market: r.market,
        timeframe: r.timeframe,
        condition: r.condition as any,
        entryCondition: r.entryCondition as any,
        exitCondition: r.exitCondition as any,
        holdingPeriod: r.holdingPeriod,
        testPeriod: r.testPeriod as any,
        costAssumption: r.costAssumption,
        hypothesis: r.hypothesis,
        status: r.status as any,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    } catch (err) {
      console.warn("DB select failed, falling back to memory:", err);
    }
  }
  return [...fallbackExperiments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getExperimentById(id: string): Promise<{
  experiment: Experiment | null;
  versions: ExperimentVersion[];
  latestResult: ExperimentResult | null;
}> {
  if (db) {
    try {
      const [expRow] = await db.select().from(experiments).where(eq(experiments.id, id));
      if (expRow) {
        const vRows = await db
          .select()
          .from(experimentVersions)
          .where(eq(experimentVersions.experimentId, id))
          .orderBy(desc(experimentVersions.versionNumber));

        const [rRow] = await db
          .select()
          .from(experimentResults)
          .where(eq(experimentResults.experimentId, id))
          .orderBy(desc(experimentResults.createdAt));

        const exp: Experiment = {
          id: expRow.id,
          title: expRow.title,
          originalQuestion: expRow.originalQuestion,
          market: expRow.market,
          timeframe: expRow.timeframe,
          condition: expRow.condition as any,
          entryCondition: expRow.entryCondition as any,
          exitCondition: expRow.exitCondition as any,
          holdingPeriod: expRow.holdingPeriod,
          testPeriod: expRow.testPeriod as any,
          costAssumption: expRow.costAssumption,
          hypothesis: expRow.hypothesis,
          status: expRow.status as any,
          createdAt: expRow.createdAt.toISOString(),
          updatedAt: expRow.updatedAt.toISOString(),
        };

        const versions: ExperimentVersion[] = vRows.map((v) => ({
          id: v.id,
          experimentId: v.experimentId,
          versionNumber: v.versionNumber,
          experimentData: v.experimentData as any,
          changeSummary: `Version ${v.versionNumber}`,
          createdAt: v.createdAt.toISOString(),
        }));

        const result: ExperimentResult | null = rRow
          ? {
              id: rRow.id,
              experimentId: rRow.experimentId,
              versionNumber: 1,
              observations: rRow.observations,
              winningTrades: rRow.winningTrades,
              losingTrades: rRow.losingTrades,
              winRate: rRow.winRate,
              averageReturn: rRow.averageReturn,
              medianReturn: rRow.medianReturn,
              bestReturn: rRow.bestReturn,
              worstReturn: rRow.worstReturn,
              cumulativeReturn: rRow.cumulativeReturn,
              datasetType: rRow.datasetType,
              trades: [],
              equityCurve: [],
              returnDistribution: [],
              createdAt: rRow.createdAt.toISOString(),
            }
          : null;

        return { experiment: exp, versions, latestResult: result };
      }
    } catch (err) {
      console.warn("DB query failed, using memory:", err);
    }
  }

  const exp = fallbackExperiments.find((e) => e.id === id) || null;
  const versions = fallbackVersions[id] || [];
  const latestResult = fallbackResults[id] || null;

  return { experiment: exp, versions, latestResult };
}

export async function saveExperiment(
  data: ExperimentData,
  originalQuestion: string,
  title?: string
): Promise<Experiment> {
  const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const expTitle = title || `${data.market} — ${data.condition.description}`;

  const experiment: Experiment = {
    id,
    title: expTitle,
    originalQuestion,
    market: data.market,
    timeframe: data.timeframe,
    condition: data.condition,
    entryCondition: data.entry,
    exitCondition: data.exit,
    holdingPeriod: data.holdingPeriod,
    testPeriod: data.testPeriod,
    costAssumption: data.costAssumption,
    hypothesis: data.hypothesis,
    status: "ready",
    createdAt: now,
    updatedAt: now,
  };

  const initialVersion: ExperimentVersion = {
    id: `ver-${id}-1`,
    experimentId: id,
    versionNumber: 1,
    experimentData: data,
    changeSummary: "Initial experiment definition",
    createdAt: now,
  };

  if (db) {
    try {
      await db.insert(experiments).values({
        id: experiment.id,
        title: experiment.title,
        originalQuestion: experiment.originalQuestion,
        market: experiment.market,
        timeframe: experiment.timeframe,
        condition: experiment.condition,
        entryCondition: experiment.entryCondition,
        exitCondition: experiment.exitCondition,
        holdingPeriod: experiment.holdingPeriod,
        testPeriod: experiment.testPeriod,
        costAssumption: experiment.costAssumption,
        hypothesis: experiment.hypothesis,
        status: experiment.status,
      });

      await db.insert(experimentVersions).values({
        id: initialVersion.id,
        experimentId: id,
        versionNumber: 1,
        experimentData: data,
      });
    } catch (err) {
      console.warn("DB insert failed, falling back to memory:", err);
    }
  }

  fallbackExperiments.unshift(experiment);
  fallbackVersions[id] = [initialVersion];

  return experiment;
}

export async function addExperimentVersion(
  experimentId: string,
  data: ExperimentData,
  changeSummary: string
): Promise<ExperimentVersion> {
  const versions = fallbackVersions[experimentId] || [];
  const nextVer = versions.length + 1;
  const now = new Date().toISOString();

  const newVersion: ExperimentVersion = {
    id: `ver-${experimentId}-${nextVer}`,
    experimentId,
    versionNumber: nextVer,
    experimentData: data,
    changeSummary,
    createdAt: now,
  };

  if (db) {
    try {
      await db.insert(experimentVersions).values({
        id: newVersion.id,
        experimentId,
        versionNumber: nextVer,
        experimentData: data,
      });
      await db
        .update(experiments)
        .set({
          condition: data.condition,
          holdingPeriod: data.holdingPeriod,
          exitCondition: data.exit,
          costAssumption: data.costAssumption,
          hypothesis: data.hypothesis,
          updatedAt: new Date(),
        })
        .where(eq(experiments.id, experimentId));
    } catch (err) {
      console.warn("DB version update failed:", err);
    }
  }

  versions.unshift(newVersion);
  fallbackVersions[experimentId] = versions;

  const targetExp = fallbackExperiments.find((e) => e.id === experimentId);
  if (targetExp) {
    targetExp.condition = data.condition;
    targetExp.holdingPeriod = data.holdingPeriod;
    targetExp.exitCondition = data.exit;
    targetExp.costAssumption = data.costAssumption;
    targetExp.hypothesis = data.hypothesis;
    targetExp.updatedAt = now;
  }

  return newVersion;
}

export async function saveResult(
  experimentId: string,
  result: ExperimentResult
): Promise<void> {
  fallbackResults[experimentId] = result;

  const exp = fallbackExperiments.find((e) => e.id === experimentId);
  if (exp) {
    exp.status = "tested";
  }

  if (db) {
    try {
      await db.insert(experimentResults).values({
        id: result.id,
        experimentId,
        observations: result.observations,
        winningTrades: result.winningTrades,
        losingTrades: result.losingTrades,
        winRate: result.winRate,
        averageReturn: result.averageReturn,
        medianReturn: result.medianReturn,
        bestReturn: result.bestReturn,
        worstReturn: result.worstReturn,
        cumulativeReturn: result.cumulativeReturn,
        datasetType: result.datasetType,
      });

      await db
        .update(experiments)
        .set({ status: "tested", updatedAt: new Date() })
        .where(eq(experiments.id, experimentId));
    } catch (err) {
      console.warn("DB result insert failed:", err);
    }
  }
}
