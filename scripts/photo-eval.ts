/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Photo-to-Circuit Lab Agent — Vision & MNA Evaluation Benchmark Runner
 * Runs the real perception pipeline (Meta Muse Spark Open via Baseten) against ground truth images.
 * Strict safety & budget limits: at most 12 photos, at most 2 calls per photo, never log secrets.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {perceiveCircuitPhoto} from '../server/circuitAgent.ts';
import {convertNetlistToMNACircuit, NetlistCircuit} from '../shared/schema/netlist.ts';
import {solveCircuit, getCircuitVerdict} from '../shared/solver/mnaSolver.ts';

dotenv.config();

interface ExpectedComponent {
  type: string;
  value?: number;
  isOpen?: boolean;
  label?: string;
}

interface ExpectedItem {
  id: string;
  filename: string;
  description: string;
  topology: 'series' | 'parallel' | 'mixed';
  expectedVerdict: 'works' | 'open circuit' | 'short circuit' | 'meter misplaced';
  expectedComponents: ExpectedComponent[];
}

export interface EvaluationResult {
  photoId: string;
  description: string;
  schemaValid: boolean;
  retried: boolean;
  finishReason: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  expectedTopology: string;
  detectedTopology: string;
  topologyCorrect: boolean;
  expectedVerdict: string;
  solverVerdict: string;
  verdictCorrect: boolean;
  componentStats: {
    matched: number;
    missing: number;
    extra: number;
    precision: number;
    recall: number;
    perType: Record<string, {expected: number; detected: number; matched: number; missing: number; extra: number}>;
  };
  truncatedFallbackTriggered?: boolean;
  error?: string;
}

/**
 * Deterministically analyzes graph topology of the netlist
 */
function evaluateTopology(netlist: NetlistCircuit): 'series' | 'parallel' | 'mixed' {
  // Ignore voltmeters when determining power topology because they are parallel measurement probes
  const powerElements = netlist.components.filter((c) => c.type !== 'voltmeter');
  if (powerElements.length <= 1) return 'series';

  // Count node connections
  const nodeConnections = new Map<string, number>();
  const branchPairs = new Map<string, number>();

  for (const el of powerElements) {
    nodeConnections.set(el.nodeA, (nodeConnections.get(el.nodeA) || 0) + 1);
    nodeConnections.set(el.nodeB, (nodeConnections.get(el.nodeB) || 0) + 1);

    const pairKey = [el.nodeA, el.nodeB].sort().join('--');
    branchPairs.set(pairKey, (branchPairs.get(pairKey) || 0) + 1);
  }

  // Check for parallel elements (multiple components between the exact same node pair)
  const hasParallelBranches = Array.from(branchPairs.values()).some((count) => count > 1);

  // Check if every node connects at most 2 elements (single loop = series)
  const maxNodeDegree = Math.max(...Array.from(nodeConnections.values()));

  if (!hasParallelBranches && maxNodeDegree <= 2) {
    return 'series';
  }
  if (hasParallelBranches && maxNodeDegree > 2) {
    return powerElements.length <= 3 ? 'parallel' : 'mixed';
  }
  return 'series';
}

export async function runPhotoEvaluation(): Promise<{
  results: EvaluationResult[];
  summary: {
    totalPhotos: number;
    schemaValidRate: number;
    topologyAccuracy: number;
    verdictAccuracy: number;
    overallPrecision: number;
    overallRecall: number;
    avgPromptTokens: number;
    avgCompletionTokens: number;
    totalTokens: number;
    avgLatencyMs: number;
  };
}> {
  const expectedPath = path.resolve(process.cwd(), 'tests/photo-eval/expected.json');
  if (!fs.existsSync(expectedPath)) {
    throw new Error(`expected.json not found at ${expectedPath}`);
  }

  const expectedData: ExpectedItem[] = JSON.parse(fs.readFileSync(expectedPath, 'utf-8'));
  const photosToRun = expectedData.slice(0, 12); // strict budget limit <= 12

  console.log(`\n=== Running Circuit Photo Vision & Solver Evaluation (${photosToRun.length} photos) ===\n`);

  const results: EvaluationResult[] = [];

  for (const item of photosToRun) {
    const imagePath = path.resolve(process.cwd(), 'tests/photo-eval/images', item.filename);
    if (!fs.existsSync(imagePath)) {
      console.warn(`[WARN] Image file ${imagePath} does not exist, skipping.`);
      continue;
    }

    console.log(`Evaluating ${item.filename}: "${item.description}"...`);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Real call through perceiveCircuitPhoto
    const perception = await perceiveCircuitPhoto(base64Image);

    // Run deterministic MNA solver on perceived netlist
    const mnaCircuit = convertNetlistToMNACircuit(perception.netlist);
    const solution = solveCircuit(mnaCircuit);
    const solverVerdict = getCircuitVerdict(solution);

    // Analyze topology
    const detectedTopology = evaluateTopology(perception.netlist);
    const topologyCorrect = detectedTopology === item.topology;
    const verdictCorrect = solverVerdict === item.expectedVerdict;

    // Per-type component metrics:
    // METHODOLOGY DECISION: Exclude 'wire' from discrete component precision/recall.
    // Wires represent equipotential nodes/connections rather than discrete components.
    // Connectivity and loop closure are evaluated separately via topology and solver verdict.
    const expectedTypeCounts: Record<string, number> = {};
    for (const ec of item.expectedComponents) {
      if (ec.type === 'wire') continue;
      expectedTypeCounts[ec.type] = (expectedTypeCounts[ec.type] || 0) + 1;
    }

    const detectedTypeCounts: Record<string, number> = {};
    for (const dc of perception.netlist.components) {
      if (dc.type === 'wire') continue;
      detectedTypeCounts[dc.type] = (detectedTypeCounts[dc.type] || 0) + 1;
    }

    const allTypes = Array.from(new Set([...Object.keys(expectedTypeCounts), ...Object.keys(detectedTypeCounts)]));
    const perType: Record<string, {expected: number; detected: number; matched: number; missing: number; extra: number}> = {};

    let totalMatched = 0;
    let totalDetected = 0;
    let totalExpected = 0;

    for (const t of allTypes) {
      const exp = expectedTypeCounts[t] || 0;
      const det = detectedTypeCounts[t] || 0;
      const matched = Math.min(exp, det);
      const missing = Math.max(0, exp - det);
      const extra = Math.max(0, det - exp);

      perType[t] = {expected: exp, detected: det, matched, missing, extra};
      totalMatched += matched;
      totalDetected += det;
      totalExpected += exp;
    }

    const precision = totalDetected > 0 ? totalMatched / totalDetected : 1;
    const recall = totalExpected > 0 ? totalMatched / totalExpected : 1;

    const evalResult: EvaluationResult = {
      photoId: item.filename,
      description: item.description,
      schemaValid: perception.schemaValid ?? true,
      retried: perception.retried ?? false,
      finishReason: perception.finishReason ?? 'stop',
      promptTokens: perception.promptTokens ?? 0,
      completionTokens: perception.completionTokens ?? 0,
      latencyMs: perception.latencyMs ?? 0,
      expectedTopology: item.topology,
      detectedTopology,
      topologyCorrect,
      expectedVerdict: item.expectedVerdict,
      solverVerdict,
      verdictCorrect,
      componentStats: {
        matched: totalMatched,
        missing: totalExpected - totalMatched,
        extra: totalDetected - totalMatched,
        precision,
        recall,
        perType,
      },
      truncatedFallbackTriggered: perception.truncatedFallbackTriggered,
      error: perception.error,
    };

    results.push(evalResult);
    console.log(
      `  -> Schema: ${evalResult.schemaValid ? 'VALID' : 'INVALID'} | Components: P=${(precision * 100).toFixed(0)}%, R=${(recall * 100).toFixed(0)}% | Topology: ${detectedTopology} (${topologyCorrect ? 'MATCH' : 'MISMATCH'}) | Verdict: ${solverVerdict} (${verdictCorrect ? 'MATCH' : 'MISMATCH'}) | Latency: ${evalResult.latencyMs}ms`,
    );
  }

  // Aggregate metrics
  const total = results.length;
  const schemaValidCount = results.filter((r) => r.schemaValid).length;
  const topologyMatchCount = results.filter((r) => r.topologyCorrect).length;
  const verdictMatchCount = results.filter((r) => r.verdictCorrect).length;

  const avgPrecision = total > 0 ? results.reduce((sum, r) => sum + r.componentStats.precision, 0) / total : 0;
  const avgRecall = total > 0 ? results.reduce((sum, r) => sum + r.componentStats.recall, 0) / total : 0;
  const avgPromptTokens = total > 0 ? results.reduce((sum, r) => sum + r.promptTokens, 0) / total : 0;
  const avgCompletionTokens = total > 0 ? results.reduce((sum, r) => sum + r.completionTokens, 0) / total : 0;
  const totalTokens = results.reduce((sum, r) => sum + r.promptTokens + r.completionTokens, 0);
  const avgLatencyMs = total > 0 ? results.reduce((sum, r) => sum + r.latencyMs, 0) / total : 0;

  const summary = {
    totalPhotos: total,
    schemaValidRate: total > 0 ? schemaValidCount / total : 0,
    topologyAccuracy: total > 0 ? topologyMatchCount / total : 0,
    verdictAccuracy: total > 0 ? verdictMatchCount / total : 0,
    overallPrecision: avgPrecision,
    overallRecall: avgRecall,
    avgPromptTokens: Math.round(avgPromptTokens),
    avgCompletionTokens: Math.round(avgCompletionTokens),
    totalTokens,
    avgLatencyMs: Math.round(avgLatencyMs),
  };

  console.log('\n=== Evaluation Summary ===');
  console.log(`Photos evaluated: ${summary.totalPhotos}`);
  if (summary.totalPhotos < 10) {
    console.log(`[NOTICE] Sample size is ${summary.totalPhotos} (< 10 photos threshold). Overall aggregate benchmark percentages are preliminary and must not be reported as conclusive until >= 10 diverse photos are evaluated.`);
  }
  console.log(`Schema validity rate: ${(summary.schemaValidRate * 100).toFixed(1)}%`);
  console.log(`Component detection precision: ${(summary.overallPrecision * 100).toFixed(1)}%`);
  console.log(`Component detection recall: ${(summary.overallRecall * 100).toFixed(1)}%`);
  console.log(`Topology accuracy: ${(summary.topologyAccuracy * 100).toFixed(1)}%`);
  console.log(`Solver verdict accuracy: ${(summary.verdictAccuracy * 100).toFixed(1)}%`);
  console.log(`Average latency: ${summary.avgLatencyMs} ms`);
  console.log(`Total tokens used: ${summary.totalTokens} (Avg prompt: ${summary.avgPromptTokens}, Avg completion: ${summary.avgCompletionTokens})\n`);

  return {results, summary};
}

if (process.argv[1]?.endsWith('photo-eval.ts')) {
  runPhotoEvaluation()
    .then((out) => {
      // Save machine-readable evaluation report
      const outPath = path.resolve(process.cwd(), 'tests/photo-eval/eval-results.json');
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
      console.log(`Benchmark written to ${outPath}`);
    })
    .catch((err) => {
      console.error('Photo evaluation failed:', err);
      process.exit(1);
    });
}
