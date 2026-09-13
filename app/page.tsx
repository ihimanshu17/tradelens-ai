"use client";

import { useState } from "react";
import { ResearchStage, AnalysisResult, InterpretationResult } from "@/types/research";
import {
  Experiment,
  ExperimentData,
  ExperimentResult,
  CanonicalExperiment,
  ComparisonBranch,
  generateHypothesis,
  validateAndEnforceHypothesisFidelity,
  canonicalToExperimentData,
  validateExperimentAgainstSelections,
  assertExperimentFidelity,
  validateIntentPreservation,
  buildExperimentContract,
} from "@/types/experiment";
import { PipelineIndicator } from "@/components/layout/PipelineIndicator";
import { AskStage } from "@/components/research/AskStage";
import { ClarifyStage } from "@/components/research/ClarifyStage";
import { ChallengeStage } from "@/components/research/ChallengeStage";
import { DefineStage } from "@/components/research/DefineStage";
import { TestStage } from "@/components/research/TestStage";
import { LearnStage } from "@/components/research/LearnStage";

export default function HomePage() {
  const [currentStage, setCurrentStage] = useState<ResearchStage>("ask");
  const [completedStages, setCompletedStages] = useState<ResearchStage[]>([]);

  // ONE Canonical Experiment Specification object that flows through all stages
  const [canonicalExperiment, setCanonicalExperiment] = useState<CanonicalExperiment | null>(null);

  // Active experiment specification and persisted experiment record
  const [activeExperiment, setActiveExperiment] = useState<ExperimentData | null>(null);
  const [savedExperiment, setSavedExperiment] = useState<Experiment | null>(null);
  const [testResult, setTestResult] = useState<ExperimentResult | null>(null);
  const [interpretationResult, setInterpretationResult] = useState<InterpretationResult | null>(null);

  // Question & analysis state
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Loading & Error states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isClarifying, setIsClarifying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const markCompleted = (stage: ResearchStage) => {
    setCompletedStages((prev) => (prev.includes(stage) ? prev : [...prev, stage]));
  };

  // Immediate canonical state updater: updates the single source of truth immediately
  const handleUpdateCanonical = (updates: Partial<CanonicalExperiment>) => {
    setCanonicalExperiment((prev) => {
      if (!prev) return prev;
      let updated: CanonicalExperiment = { ...prev, ...updates };

      // Keep threshold and conditionThreshold in lockstep
      if (updates.threshold !== undefined && updates.conditionThreshold === undefined) {
        updated.conditionThreshold = updates.threshold;
      } else if (updates.conditionThreshold !== undefined && updates.threshold === undefined) {
        updated.threshold = updates.conditionThreshold;
      }

      const activeThreshold = updated.threshold ?? updated.conditionThreshold ?? 2.0;
      updated.threshold = activeThreshold;
      updated.conditionThreshold = activeThreshold;

      // If conditionThreshold changed and comparisons exist, propagate new threshold to both comparison branches
      if ((updates.threshold !== undefined || updates.conditionThreshold !== undefined) && updated.comparisons) {
        updated.comparisons = updated.comparisons.map((c) => ({
          ...c,
          condition: { ...c.condition, threshold: activeThreshold },
        })) as [ComparisonBranch, ComparisonBranch];
      }

      // Ensure comparison experiments maintain synchronized baseline state
      if (updated.experimentType === "comparison" && updated.comparisons && updated.comparisons.length >= 2) {
        if (!updated.baselineType) {
          updated.baselineType = "another_condition";
        }
        if (!updated.baselineDescription) {
          updated.baselineDescription = updated.comparisons[1].name;
        }
        if (!updated.assumptionProvenance?.baseline) {
          updated.assumptionProvenance = {
            ...updated.assumptionProvenance,
            baseline: "USER PROVIDED",
          };
        }
      }

      // Always validate and enforce hypothesis fidelity from the authoritative canonical experiment
      updated.hypothesis = validateAndEnforceHypothesisFidelity(updated);

      // Immediately synchronize activeExperiment so all components read the exact same state
      setActiveExperiment(canonicalToExperimentData(updated));
      return updated;
    });
  };

  // Stage 1 -> 2: Analyze question
  const handleAnalyzeQuestion = async (question: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setCurrentQuestion(question);
    setTestResult(null);
    setInterpretationResult(null);
    setSavedExperiment(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "Analysis failed");
      }

      const data: AnalysisResult = await res.json();
      setAnalysisResult(data);

      // Initialize the ONE Canonical Experiment Specification
      const initialThreshold = data.proposedThreshold ?? 2.0;
      const initialHolding = data.proposedHoldingDays ?? 5;
      const initialInstrument = data.instrument || "NIFTY";
      const experimentType = data.experimentType || "single";
      const comparisons = data.comparisons;
      const isComparison = experimentType === "comparison" && !!comparisons && comparisons.length >= 2;

      const initialCanonical: CanonicalExperiment = {
        originalQuestion: question,
        experimentType,
        comparisons,
        comparisonMetric: data.comparisonMetric,
        instrument: initialInstrument,
        timeframe: data.timeframe || "daily",
        threshold: initialThreshold,
        conditionThreshold: initialThreshold,
        holdingPeriod: initialHolding,
        exitRule: "holding_period",
        lookbackPeriod: 5,
        friction: 0.001, // 0.10%
        entryRule: "next_open",
        contextConditions: data.contextConditions,
        baselineType: isComparison ? "another_condition" : undefined,
        baselineDescription: isComparison ? comparisons![1].name : undefined,
        assumptionProvenance: {
          timing: "AI SUGGESTED",
          friction: "AI SUGGESTED",
          holding: "USER CONFIRMED",
          ...(isComparison ? { baseline: "USER PROVIDED" as const } : {}),
        },
        hypothesis: generateHypothesis({
          instrument: initialInstrument,
          conditionThreshold: initialThreshold,
          threshold: initialThreshold,
          holdingPeriod: initialHolding,
          experimentType,
          comparisons,
          contextConditions: data.contextConditions,
          comparisonMetric: data.comparisonMetric,
        }),
      };

      setCanonicalExperiment(initialCanonical);
      setActiveExperiment(canonicalToExperimentData(initialCanonical));

      markCompleted("ask");
      setCurrentStage("clarify");
    } catch (err: any) {
      console.error("Analysis error:", err);
      setErrorMsg(err.message || "Failed to analyze question. Please check input.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Stage 2 -> 3: User completes clarification -> Challenge (Research Integrity Check)
  const handleClarifySubmit = () => {
    if (!canonicalExperiment) return;
    markCompleted("clarify");
    setCurrentStage("challenge");
  };

  // Stage 3 -> 4: User completes Research Integrity Check -> Define
  const handleChallengeProceedToDefine = async () => {
    if (!canonicalExperiment) return;

    const thresholdVal = canonicalExperiment.threshold ?? canonicalExperiment.conditionThreshold ?? 2.0;
    const selectedExpected = {
      threshold: thresholdVal,
      holdingDays: canonicalExperiment.holdingPeriod,
      testYears: canonicalExperiment.lookbackPeriod,
      friction: canonicalExperiment.friction,
    };

    // Final validation before entering Define: verify canonical state contains current user selections
    validateExperimentAgainstSelections(canonicalExperiment, selectedExpected);

    // Validate research intent preservation (ensures no conditions from question are silently dropped)
    validateIntentPreservation(canonicalExperiment);

    // Build canonical experiment contract
    const contract = buildExperimentContract(canonicalExperiment, "READY");
    const updatedCanonical = { ...canonicalExperiment, contract };
    setCanonicalExperiment(updatedCanonical);

    // Authoritative experiment specification derived directly from canonical state
    const expData = canonicalToExperimentData(updatedCanonical);
    // Development-time fidelity assertion
    assertExperimentFidelity(expData, selectedExpected);
    setActiveExperiment(expData);

    // Invalidate downstream simulation results when clarified parameters are updated/submitted
    setTestResult(null);
    setInterpretationResult(null);

    setIsClarifying(true);
    setErrorMsg(null);

    try {
      // Persist to server repository with exact user values
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalQuestion: canonicalExperiment.originalQuestion,
          instrument: canonicalExperiment.instrument,
          timeframe: canonicalExperiment.timeframe,
          threshold: thresholdVal,
          holdingDays: canonicalExperiment.holdingPeriod,
          testYears: canonicalExperiment.lookbackPeriod,
          exitType: canonicalExperiment.exitRule,
          costAssumption: canonicalExperiment.friction,
          experimentType: canonicalExperiment.experimentType,
          comparisons: canonicalExperiment.comparisons,
          contextConditions: canonicalExperiment.contextConditions,
          comparisonMetric: canonicalExperiment.comparisonMetric,
        }),
      });

      if (res.ok) {
        const { experiment } = await res.json();
        setSavedExperiment(experiment);
      }
    } catch (err: any) {
      console.warn("Could not persist to DB, continuing with canonical client state:", err);
    } finally {
      setIsClarifying(false);
      markCompleted("challenge");
      setCurrentStage("define");
    }
  };

  // Stage 3 -> 4: Run deterministic simulation on the exact canonical experiment
  const handleRunTest = async () => {
    if (!activeExperiment) return;

    // Requirement 8: Development-time validation before running simulation
    if (canonicalExperiment) {
      const thresholdVal = canonicalExperiment.threshold ?? canonicalExperiment.conditionThreshold ?? 2.0;
      assertExperimentFidelity(activeExperiment, {
        threshold: thresholdVal,
        holdingDays: canonicalExperiment.holdingPeriod,
        testYears: canonicalExperiment.lookbackPeriod,
        friction: canonicalExperiment.friction,
      });
    }

    setIsTesting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId: savedExperiment?.id,
          experiment: activeExperiment,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Research simulation failed");
      }

      const result: ExperimentResult = await res.json();
      setTestResult(result);
      markCompleted("define");
      setCurrentStage("test");
    } catch (err: any) {
      console.error("Testing error:", err);
      setErrorMsg(err.message || "Simulation failed to execute.");
    } finally {
      setIsTesting(false);
    }
  };

  // Stage 4 -> 5: Learn & interpret evidence with AI
  const handleProceedToLearn = async () => {
    if (!activeExperiment || !testResult) return;

    setIsLearning(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experiment: activeExperiment,
          resultSummary: {
            observations: testResult.observations,
            winningTrades: testResult.winningTrades,
            losingTrades: testResult.losingTrades,
            winRate: testResult.winRate,
            averageReturn: testResult.averageReturn,
            medianReturn: testResult.medianReturn,
            bestReturn: testResult.bestReturn,
            worstReturn: testResult.worstReturn,
            cumulativeReturn: testResult.cumulativeReturn,
            comparisonResults: testResult.comparisonResults,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Learning synthesis failed");
      }

      const interpretation: InterpretationResult = await res.json();
      setInterpretationResult(interpretation);
      markCompleted("test");
      markCompleted("learn");
      setCurrentStage("learn");
    } catch (err: any) {
      console.error("Learning error:", err);
      setErrorMsg(err.message || "Failed to generate AI interpretation.");
    } finally {
      setIsLearning(false);
    }
  };

  // Follow-up question clicked in Stage 5: starts new research
  const handleFollowUpClick = (question: string) => {
    handleAnalyzeQuestion(question);
  };

  // Fork as Version 2: allows tweaking parameters and tracking version history
  const handleNewVersion = async () => {
    if (!canonicalExperiment || !savedExperiment) return;

    const newHolding = canonicalExperiment.holdingPeriod === 5 ? 10 : 5;
    handleUpdateCanonical({ holdingPeriod: newHolding });

    const updatedData = canonicalToExperimentData({
      ...canonicalExperiment,
      holdingPeriod: newHolding,
    });

    try {
      const res = await fetch("/api/experiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId: savedExperiment.id,
          experimentData: updatedData,
          changeSummary: `Changed holding period to ${newHolding} days`,
        }),
      });

      if (res.ok) {
        setCurrentStage("define");
      }
    } catch (err) {
      console.error("Failed to spawn version:", err);
      setCurrentStage("define");
    }
  };

  const handleRestart = () => {
    setCurrentStage("ask");
    setCompletedStages([]);
    setCurrentQuestion("");
    setAnalysisResult(null);
    setCanonicalExperiment(null);
    setActiveExperiment(null);
    setSavedExperiment(null);
    setTestResult(null);
    setInterpretationResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Pipeline Navigation Bar */}
      <PipelineIndicator
        currentStage={currentStage}
        completedStages={completedStages}
        onSelectStage={(stage) => setCurrentStage(stage)}
      />

      {/* Stage Views */}
      <div className="transition-all duration-300">
        {currentStage === "ask" && (
          <AskStage
            onSubmitQuestion={handleAnalyzeQuestion}
            isLoading={isAnalyzing}
            error={errorMsg}
          />
        )}

        {currentStage === "clarify" && analysisResult && canonicalExperiment && (
          <ClarifyStage
            analysis={analysisResult}
            canonicalExperiment={canonicalExperiment}
            onUpdateCanonical={handleUpdateCanonical}
            onProceedToDefine={handleClarifySubmit}
            isLoading={isClarifying}
          />
        )}

        {currentStage === "challenge" && canonicalExperiment && (
          <ChallengeStage
            canonicalExperiment={canonicalExperiment}
            onUpdateCanonical={handleUpdateCanonical}
            onProceedToDefine={handleChallengeProceedToDefine}
            onBackToClarify={() => setCurrentStage("clarify")}
            isLoading={isClarifying}
          />
        )}

        {currentStage === "define" && activeExperiment && (
          <DefineStage
            experiment={activeExperiment}
            onRunTest={handleRunTest}
            onEdit={() => {
              setTestResult(null);
              setInterpretationResult(null);
              setCurrentStage("challenge");
            }}
            isLoading={isTesting}
          />
        )}

        {currentStage === "test" && activeExperiment && testResult && (
          <TestStage
            experiment={activeExperiment}
            result={testResult}
            onProceedToLearn={handleProceedToLearn}
            isLoadingLearn={isLearning}
          />
        )}

        {currentStage === "learn" && activeExperiment && testResult && interpretationResult && (
          <LearnStage
            experiment={activeExperiment}
            result={testResult}
            interpretation={interpretationResult}
            onFollowUpClick={handleFollowUpClick}
            onNewVersion={handleNewVersion}
            onRestart={handleRestart}
          />
        )}
      </div>
    </div>
  );
}