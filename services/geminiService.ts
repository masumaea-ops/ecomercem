import { getMasumaKnowledgeResponse } from "./masumaKnowledge";
import { Product } from "../types";

export interface GeminiResponse {
  text: string;
  sources?: { uri: string; title: string }[];
  provider?: string;
  products?: Product[];
}

export interface ChatHistoryTurn {
  role: string;
  parts: { text: string }[];
}

/**
 * Clean and normalize conversation history to ensure strictly alternating
 * user -> model -> user turns with no empty messages or prior error messages.
 */
function normalizeHistory(rawHistory: ChatHistoryTurn[] = []): ChatHistoryTurn[] {
  const normalized: ChatHistoryTurn[] = [];

  for (const item of rawHistory) {
    const text = item.parts?.[0]?.text?.trim();
    if (!text || text.includes("connection hiccup") || text.includes("role mismatch")) {
      continue;
    }

    const role = item.role === 'model' ? 'model' : 'user';

    // Gemini API requires the first turn to be 'user'
    if (normalized.length === 0 && role === 'model') {
      continue;
    }

    // Ensure strict alternation of roles
    if (normalized.length > 0 && normalized[normalized.length - 1].role === role) {
      normalized[normalized.length - 1].parts[0].text += `\n${text}`;
    } else {
      normalized.push({ role, parts: [{ text }] });
    }
  }

  return normalized;
}

/**
 * Enterprise AI Client: Communicates exclusively through the authenticated
 * backend server proxy (/api/ai/chat). Zero API keys are ever shipped to the browser.
 */
export const sendMessageToGemini = async (
  history: ChatHistoryTurn[],
  message: string
): Promise<GeminiResponse> => {
  const userText = message.trim();
  if (!userText) {
    return {
      text: "Please enter a question or vehicle detail so I can assist you!",
      sources: []
    };
  }

  const cleanedHistory = normalizeHistory(history);

  // ---------------------------------------------------------------------------
  // Tier 1: Query Secure Backend Proxy Endpoint (/api/ai/chat)
  // Backend holds the secret Gemini API key, matches live DB inventory, and rate limits
  // ---------------------------------------------------------------------------
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        history: cleanedHistory
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.text === 'string' && data.text.trim()) {
        return {
          text: data.text.trim(),
          sources: data.sources || [],
          provider: data.provider || 'server',
          products: data.products || []
        };
      }
    }
  } catch (backendError) {
    console.warn("Backend AI proxy unreachable or timed out, seamlessly using autonomous knowledge engine:", backendError);
  }

  // ---------------------------------------------------------------------------
  // Tier 2: Offline Guaranteed Masuma Autonomous Domain Knowledge Engine
  // Provides instant answers, genuine fitment advice, shop directions (Ruby Mall), and WhatsApp
  // ---------------------------------------------------------------------------
  const fallback = getMasumaKnowledgeResponse(userText, cleanedHistory);
  return {
    text: fallback.text,
    sources: fallback.sources || [
      { uri: "https://masuma.africa", title: "Masuma Autoparts East Africa" },
      { uri: "https://wa.me/254792506590", title: "Direct WhatsApp Line (+254 792 506 590)" }
    ],
    provider: 'masuma-engine'
  };
};
