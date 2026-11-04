/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ozmo Lab — Baseten Minimal-Cost Smoke Test Script
 * Strictly respects token & call budget (<= 10 calls, ~3000 tokens).
 * Never logs or prints secrets.
 */

import dotenv from 'dotenv';
import zlib from 'zlib';
import { buildTutorSystemPrompt } from '../server/prompts/tutorSystemPrompt.ts';

dotenv.config();

// Helper to create a tiny valid 64x64 PNG buffer in base64 (~180 bytes)
function create64x64PngBase64(): string {
  const width = 64;
  const height = 64;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const typeAndData = Buffer.concat([typeBuf, data]);
    const crc = crc32(typeAndData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeAndData, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = chunk('IHDR', ihdr);

  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter none
    for (let x = 0; x < width; x++) {
      const p = rowOffset + 1 + x * 3;
      raw[p] = 220;     // R
      raw[p + 1] = 100; // G
      raw[p + 2] = 30;  // B
    }
  }
  const compressed = zlib.deflateSync(raw);
  const idatChunk = chunk('IDAT', compressed);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]).toString('base64');
}

export interface CallResult {
  callName: string;
  status: number;
  statusText: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  finishReason: string | null;
  nonEmpty: boolean;
  content: string;
  reasoningContent?: string;
  error?: string;
  pass: boolean;
}

async function executeApiCall(params: {
  apiKey: string;
  apiUrl: string;
  model: string;
  messages: unknown[];
  maxTokens: number;
  temperature?: number;
  retryOn5xxOr429?: boolean;
}): Promise<{
  status: number;
  statusText: string;
  latencyMs: number;
  json?: any;
  errorText?: string;
}> {
  const { apiKey, apiUrl, model, messages, maxTokens, temperature = 0, retryOn5xxOr429 = true } = params;

  let attempt = 0;
  while (attempt <= 1) {
    const start = performance.now();
    try {
      const res = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      });
      const latencyMs = Math.round(performance.now() - start);

      if ((res.status === 429 || res.status >= 500) && attempt === 0 && retryOn5xxOr429) {
        attempt++;
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        return {
          status: res.status,
          statusText: res.statusText,
          latencyMs,
          errorText: errText,
        };
      }

      const json = await res.json();
      return {
        status: res.status,
        statusText: res.statusText,
        latencyMs,
        json,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      if (attempt === 0 && retryOn5xxOr429) {
        attempt++;
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      return {
        status: 0,
        statusText: 'FETCH_ERROR',
        latencyMs,
        errorText: err.message || String(err),
      };
    }
  }

  return {
    status: 0,
    statusText: 'MAX_RETRIES_EXCEEDED',
    latencyMs: 0,
  };
}

async function runSmokeTests() {
  console.log('====================================================');
  console.log('   Ozmo Lab — Baseten Integration Smoke Test        ');
  console.log('====================================================');

  // Check 3 env vars
  const hasKey = Boolean(process.env.BASETEN_API_KEY && process.env.BASETEN_API_KEY.trim().length > 0);
  const hasModel = Boolean(process.env.BASETEN_MODEL_ID && process.env.BASETEN_MODEL_ID.trim().length > 0);
  const hasUrl = Boolean(process.env.BASETEN_API_URL && process.env.BASETEN_API_URL.trim().length > 0);

  console.log(`BASETEN_API_KEY:  ${hasKey ? 'set' : 'missing'}`);
  console.log(`BASETEN_MODEL_ID: ${hasModel ? 'set' : 'missing'}`);
  console.log(`BASETEN_API_URL:  ${hasUrl ? 'set' : 'missing'}`);

  const apiKey = process.env.BASETEN_API_KEY || '';
  const apiUrl = process.env.BASETEN_API_URL || 'https://inference.baseten.co/v1';
  const modelId = process.env.BASETEN_MODEL_ID || 'meta-models/muse-spark-open-1026';

  const results: CallResult[] = [];

  // Call 1: prompt "Reply with the single word: OK", max_tokens 200
  console.log('\n--> Executing Call 1: Single-word prompt test...');
  {
    const rawRes = await executeApiCall({
      apiKey,
      apiUrl,
      model: modelId,
      messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
      maxTokens: 200,
      temperature: 0,
    });

    const choice = rawRes.json?.choices?.[0];
    const content = choice?.message?.content || '';
    const reasoning = choice?.message?.reasoning_content;
    const usage = rawRes.json?.usage || {};
    const finishReason = choice?.finish_reason || (rawRes.errorText ? 'error' : null);
    const pass = rawRes.status === 200 && content.trim().length > 0;

    results.push({
      callName: 'Call 1: "OK" prompt',
      status: rawRes.status,
      statusText: rawRes.statusText,
      latencyMs: rawRes.latencyMs,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      finishReason,
      nonEmpty: content.trim().length > 0,
      content: content.trim(),
      reasoningContent: reasoning,
      error: rawRes.errorText,
      pass,
    });
  }

  // Call 2: Real tutor prompt with open circuit situation & question "Why is the bulb off?", max_tokens 400
  console.log('--> Executing Call 2: Real tutor system prompt + open circuit scenario...');
  {
    const systemPrompt = buildTutorSystemPrompt('ru');
    const userSituation = `[СОСТОЯНИЕ СХЕМЫ / STATE JSON]:
- Сводка: Батарея 9В, лампа накаливания, выключатель (разомкнут)
- Замкнута ли цепь: false
- Опасность (короткое замыкание): false
- Количество элементов: 3
- Компоненты: [{"type":"battery","value":9},{"type":"lamp","value":"60W"},{"type":"switch","state":"open"}]

Савол / Вопрос: Why is the bulb off?`;

    const rawRes = await executeApiCall({
      apiKey,
      apiUrl,
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userSituation },
      ],
      maxTokens: 400,
      temperature: 0,
    });

    const choice = rawRes.json?.choices?.[0];
    const content = choice?.message?.content || '';
    const reasoning = choice?.message?.reasoning_content;
    const usage = rawRes.json?.usage || {};
    const finishReason = choice?.finish_reason || (rawRes.errorText ? 'error' : null);
    const pass = rawRes.status === 200 && content.trim().length > 0;

    results.push({
      callName: 'Call 2: Tutor open circuit',
      status: rawRes.status,
      statusText: rawRes.statusText,
      latencyMs: rawRes.latencyMs,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      finishReason,
      nonEmpty: content.trim().length > 0,
      content: content.trim(),
      reasoningContent: reasoning,
      error: rawRes.errorText,
      pass,
    });
  }

  // Call 3: Tiny 64x64 PNG test, max_tokens 200
  console.log('--> Executing Call 3: Vision test with 64x64 PNG...');
  {
    const pngBase64 = create64x64PngBase64();
    const rawRes = await executeApiCall({
      apiKey,
      apiUrl,
      model: modelId,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe in 5 words' },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${pngBase64}` },
            },
          ],
        },
      ],
      maxTokens: 200,
      temperature: 0,
      retryOn5xxOr429: false, // Per prompt: do not retry vision failure
    });

    const choice = rawRes.json?.choices?.[0];
    const content = choice?.message?.content || '';
    const reasoning = choice?.message?.reasoning_content;
    const usage = rawRes.json?.usage || {};
    const finishReason = choice?.finish_reason || (rawRes.errorText ? 'error' : null);
    const pass = rawRes.status === 200 && content.trim().length > 0;

    results.push({
      callName: 'Call 3: Vision (64x64 PNG)',
      status: rawRes.status,
      statusText: rawRes.statusText,
      latencyMs: rawRes.latencyMs,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      finishReason,
      nonEmpty: content.trim().length > 0,
      content: content.trim(),
      reasoningContent: reasoning,
      error: rawRes.errorText,
      pass,
    });
  }

  // Call 4: Intentional invalid API key to verify 401 handling
  console.log('--> Executing Call 4: Deliberate invalid API key 401 test...');
  {
    const fakeKey = 'invalid_test_key_nonexistent_abc123';
    const rawRes = await executeApiCall({
      apiKey: fakeKey,
      apiUrl,
      model: modelId,
      messages: [{ role: 'user', content: 'Ping' }],
      maxTokens: 50,
      temperature: 0,
      retryOn5xxOr429: false,
    });

    // We expect 401 or 403 unauthorized
    const pass = rawRes.status === 401 || rawRes.status === 403;
    results.push({
      callName: 'Call 4: Invalid key (401 check)',
      status: rawRes.status,
      statusText: rawRes.statusText,
      latencyMs: rawRes.latencyMs,
      promptTokens: 0,
      completionTokens: 0,
      finishReason: 'auth_error',
      nonEmpty: false,
      content: '',
      error: rawRes.errorText ? `Expected rejection: ${rawRes.status}` : undefined,
      pass,
    });
  }

  console.log('\n====================================================');
  console.log('                 SMOKE TEST REPORT                  ');
  console.log('====================================================\n');

  console.log('| Call | Status | Latency | Prompt Tok | Compl Tok | Finish Reason | Pass/Fail |');
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: |');
  for (const r of results) {
    console.log(
      `| ${r.callName} | ${r.status} | ${r.latencyMs}ms | ${r.promptTokens} | ${r.completionTokens} | ${r.finishReason} | ${r.pass ? 'PASS' : 'FAIL'} |`
    );
  }

  const totalPromptTokens = results.reduce((acc, r) => acc + r.promptTokens, 0);
  const totalCompletionTokens = results.reduce((acc, r) => acc + r.completionTokens, 0);
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const avgLatency = Math.round(
    results.filter((r) => r.status === 200).reduce((acc, r) => acc + r.latencyMs, 0) /
      Math.max(1, results.filter((r) => r.status === 200).length)
  );

  console.log('\n--- Metrics & Budget Summary ---');
  console.log(`Total API Calls:         ${results.length} (Budget limit: <= 10)`);
  console.log(`Prompt Tokens:           ${totalPromptTokens}`);
  console.log(`Completion Tokens:       ${totalCompletionTokens}`);
  console.log(`Total Tokens Used:       ${totalTokens} (Budget limit: ~3,000)`);
  console.log(`Average Latency (200 OK): ${avgLatency}ms`);

  console.log('\n--- Answers Output ---');
  console.log(`Call 1 Answer:\n"${results[0]?.content}"`);
  console.log(`\nCall 2 Answer (Tutor):\n"${results[1]?.content}"`);
  if (results[1]?.reasoningContent) {
    console.log(`\nCall 2 Reasoning (raw model thinking - hidden from students): [${results[1].reasoningContent.length} chars]`);
  }
  if (results[2]) {
    if (results[2].pass) {
      console.log(`\nCall 3 Vision Answer:\n"${results[2].content}"`);
    } else {
      console.log(`\nCall 3 Vision Result: UNSUPPORTED. Error: ${results[2].error || results[2].statusText}`);
    }
  }

  // Export results to JSON for machine readability if needed
  return {
    results,
    totalTokens,
    avgLatency,
  };
}

runSmokeTests().catch((err) => {
  console.error('Smoke test fatal error:', err);
  process.exit(1);
});
