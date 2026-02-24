/**
 * controllers/aiController.js
 * --------------------------------------------------
 * Gemini AI chat for Cycling Community assistant.
 * POST /api/ai/chat       — non-streaming (legacy).
 * POST /api/ai/chat/stream — streaming (SSE), faster model + maxOutputTokens.
 */

import asyncHandler from "express-async-handler";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `You are a friendly assistant for a Sri Lankan Cycling Community app. Answer in Sinhala and English. Help users with cycling tips and app features.`;

const HISTORY_LIMIT = 4;
const MAX_OUTPUT_TOKENS = 200;
const RATE_LIMIT_MSG = "The AI is thinking a bit too much, please wait a moment.";

function buildGeminiHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return [];
  const slice = history.slice(-HISTORY_LIMIT * 2);
  return slice.map((h) => ({
    role: h.role === "user" ? "user" : "model",
    parts: [{ text: String(h.content || h.text || "").trim() || " " }],
  }));
}

function is429(err) {
  const msg = err.message || "";
  return err.status === 429 || msg.includes("429") || msg.toLowerCase().includes("resource exhausted") || msg.toLowerCase().includes("rate limit");
}

/** Non-streaming (legacy). */
export const chat = asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body;
  const trimmed = typeof message === "string" ? message.trim() : "";
  if (!trimmed) {
    res.status(400);
    throw new Error("Message is required");
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    res.status(503);
    throw new Error("AI assistant is not configured.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiHistory = buildGeminiHistory(history);
  const model = genAI.getGenerativeModel(
    { model: "gemini-2.5-flash", systemInstruction: SYSTEM_INSTRUCTION },
    { apiVersion: "v1beta" }
  );
  let chatSession;
  try {
    chatSession = geminiHistory.length > 0 ? model.startChat({ history: geminiHistory }) : model.startChat();
  } catch (err) {
    if (is429(err)) {
      res.status(429);
      throw new Error(RATE_LIMIT_MSG);
    }
    throw err;
  }
  try {
    const result = await chatSession.sendMessage(trimmed);
    res.json({ reply: result.response.text() || "" });
  } catch (err) {
    if (is429(err)) {
      res.status(429);
      throw new Error(RATE_LIMIT_MSG);
    }
    throw err;
  }
});

/**
 * Streaming: gemini-2.5-flash, maxOutputTokens 200, SSE.
 * Only called from user Send action — no socket/typing triggers.
 */
export const chatStream = asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body;
  const trimmed = typeof message === "string" ? message.trim() : "";
  if (!trimmed) {
    res.status(400);
    throw new Error("Message is required");
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    res.status(503);
    throw new Error("AI assistant is not configured.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiHistory = buildGeminiHistory(history);
  const model = genAI.getGenerativeModel(
    {
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    },
    { apiVersion: "v1beta" }
  );
  const generationConfig = { maxOutputTokens: MAX_OUTPUT_TOKENS };
  let chatSession;
  try {
    chatSession = geminiHistory.length > 0
      ? model.startChat({ history: geminiHistory, generationConfig })
      : model.startChat({ generationConfig });
  } catch (err) {
    if (is429(err)) {
      res.status(429);
      throw new Error(RATE_LIMIT_MSG);
    }
    throw err;
  }

  let streamResult;
  try {
    streamResult = await chatSession.sendMessageStream(trimmed);
  } catch (err) {
    if (is429(err)) {
      res.status(429);
      throw new Error(RATE_LIMIT_MSG);
    }
    throw err;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  try {
    for await (const chunk of streamResult.stream) {
      const text = chunk.text && typeof chunk.text === "function" ? chunk.text() : "";
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
  } catch (streamErr) {
    const errMsg = streamErr.message || "Stream error";
    res.write(`data: ${JSON.stringify({ error: is429(streamErr) ? RATE_LIMIT_MSG : errMsg })}\n\n`);
  }
  res.write("data: [DONE]\n\n");
  res.end();
});
