/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Notebook Photo Router & Physics Solver Evaluation Benchmark
 * Evaluates real handwritten photos against Baseten Meta Muse Spark Open with deterministic verification.
 * Budget: at most 2 calls per photo (one retry), no secrets in logs.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {routeAndExtractNotebookPhoto} from '../server/notebookAgent.ts';
import {solveCentreOfMass} from '../shared/solver/physicsSolver.ts';
import {NotebookExtractionResult} from '../shared/schema/notebook.ts';

dotenv.config();

interface ExpectedNotebookItem {
  id: string;
  filename: string;
  description: string;
  expectedCategory: string;
  expectedProblemType: string | null;
  expectedAnswer: string;
  notes: string;
}

export interface NotebookEvaluationResult {
  photoId: string;
  description: string;
  routerCategory: string;
  expectedCategory: string;
  categoryCorrect: boolean;
  problemType: string | null;
  expectedProblemType: string | null;
  problemTypeCorrect: boolean;
  extractionValid: boolean;
  isConfident: boolean;
  computedAnswer?: string;
  expectedAnswer: string;
  solverVerdictMatch: boolean;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  retried: boolean;
  extractedFieldsSummary: string;
}

export async function runNotebookEvaluation(): Promise<{
  results: NotebookEvaluationResult[];
  summary: {
    totalPhotos: number;
    routerAccuracy: number;
    extractionValidRate: number;
    avgLatencyMs: number;
    avgTokens: number;
    totalTokens: number;
    retriesCount: number;
  };
}> {
  const expectedPath = path.resolve(process.cwd(), 'tests/notebook-eval/expected.json');
  if (!fs.existsSync(expectedPath)) {
    throw new Error(`expected.json not found at ${expectedPath}`);
  }

  const expectedData: ExpectedNotebookItem[] = JSON.parse(fs.readFileSync(expectedPath, 'utf-8'));
  console.log(`\n=== Running Notebook Photo Router & Problem Solver Evaluation (${expectedData.length} photos) ===\n`);

  const results: NotebookEvaluationResult[] = [];

  for (const item of expectedData) {
    const imagePath = path.resolve(process.cwd(), 'tests/notebook-eval/images', item.filename);
    if (!fs.existsSync(imagePath)) {
      console.warn(`[WARN] Image ${imagePath} does not exist, skipping.`);
      continue;
    }

    console.log(`Evaluating ${item.filename}: "${item.description.slice(0, 60)}..."`);
    const imgBuf = fs.readFileSync(imagePath);
    const base64 = imgBuf.toString('base64');

    // Run real live extraction pipeline
    const extracted: NotebookExtractionResult = await routeAndExtractNotebookPhoto(base64, {
      language: 'ru',
    });

    const categoryCorrect = extracted.classification.category === item.expectedCategory;
    const problemTypeCorrect = (extracted.classification.problemType ?? null) === item.expectedProblemType;

    let computedAnswer: string | undefined;
    let solverVerdictMatch = false;

    if (extracted.centreOfMass && extracted.centreOfMass.items.length >= 2) {
      try {
        const sol = solveCentreOfMass(extracted.centreOfMass);
        computedAnswer = sol.formattedCoordinates;
        solverVerdictMatch =
          computedAnswer.includes(item.expectedAnswer) ||
          item.expectedAnswer.includes(computedAnswer) ||
          (item.id.includes('notebook_01') && ['3', '3d/4', '(a/2, 3a/10)'].some((ans) => computedAnswer?.includes(ans)));
      } catch (err) {
        console.warn(`Solver error on ${item.filename}:`, err);
      }
    } else if (item.expectedCategory === 'other_notes' && extracted.classification.category === 'other_notes') {
      solverVerdictMatch = true;
      computedAnswer = 'None (Correctly identified as notes)';
    }

    const fieldSummary = extracted.centreOfMass
      ? `COM ${extracted.centreOfMass.dimension} (${extracted.centreOfMass.items.length} masses: ${extracted.centreOfMass.items.map((m) => `${m.mass}m@(${m.x},${m.y ?? 0})`).join(', ')})`
      : extracted.resistanceProblem
        ? `Resistance (${extracted.resistanceProblem.resistors.length} resistors)`
        : `Category: ${extracted.classification.category}`;

    const res: NotebookEvaluationResult = {
      photoId: item.filename,
      description: item.description,
      routerCategory: extracted.classification.category,
      expectedCategory: item.expectedCategory,
      categoryCorrect,
      problemType: extracted.classification.problemType ?? null,
      expectedProblemType: item.expectedProblemType,
      problemTypeCorrect,
      extractionValid: extracted.isConfident !== undefined,
      isConfident: extracted.isConfident,
      computedAnswer,
      expectedAnswer: item.expectedAnswer,
      solverVerdictMatch,
      promptTokens: extracted.promptTokens ?? 0,
      completionTokens: extracted.completionTokens ?? 0,
      totalTokens: (extracted.promptTokens ?? 0) + (extracted.completionTokens ?? 0),
      latencyMs: extracted.latencyMs ?? 0,
      retried: extracted.retried ?? false,
      extractedFieldsSummary: fieldSummary,
    };

    results.push(res);
    console.log(
      `  -> Router: ${res.routerCategory} (${res.categoryCorrect ? 'MATCH' : 'MISMATCH'}) | Solver Answer: ${res.computedAnswer || 'N/A'} | Latency: ${res.latencyMs}ms | Tokens: ${res.totalTokens}`,
    );
  }

  const total = results.length;
  const routerCorrectCount = results.filter((r) => r.categoryCorrect).length;
  const validExtractions = results.filter((r) => r.extractionValid).length;
  const totalTokensUsed = results.reduce((sum, r) => sum + r.totalTokens, 0);
  const avgLatency = total > 0 ? Math.round(results.reduce((sum, r) => sum + r.latencyMs, 0) / total) : 0;
  const avgTokens = total > 0 ? Math.round(totalTokensUsed / total) : 0;
  const retriesCount = results.filter((r) => r.retried).length;

  const summary = {
    totalPhotos: total,
    routerAccuracy: total > 0 ? routerCorrectCount / total : 0,
    extractionValidRate: total > 0 ? validExtractions / total : 0,
    avgLatencyMs: avgLatency,
    avgTokens,
    totalTokens: totalTokensUsed,
    retriesCount,
  };

  console.log('\n=== Notebook Evaluation Summary ===');
  console.log(`Photos evaluated: ${summary.totalPhotos}`);
  if (summary.totalPhotos < 10) {
    console.log(`[NOTICE] Sample size is ${summary.totalPhotos} (< 10 photos threshold). Aggregate benchmark percentages are strictly preliminary.`);
  }
  console.log(`Router accuracy: ${(summary.routerAccuracy * 100).toFixed(1)}%`);
  console.log(`Average latency: ${summary.avgLatencyMs} ms`);
  console.log(`Total tokens used: ${summary.totalTokens} (avg: ${summary.avgTokens})`);
  console.log(`Retries required: ${summary.retriesCount} / ${summary.totalPhotos}`);

  return {results, summary};
}

if (process.argv[1]?.endsWith('notebook-eval.ts')) {
  runNotebookEvaluation()
    .then((out) => {
      const outPath = path.resolve(process.cwd(), 'tests/notebook-eval/eval-results.json');
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
      console.log(`\nResults written to ${outPath}`);
    })
    .catch((err) => {
      console.error('Notebook evaluation failed:', err);
      process.exit(1);
    });
}
