import { Router, Request, Response } from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { getMasumaKnowledgeResponse } from '../services/masumaKnowledge';
import { ProductService } from '../services/productService';

const router = Router();

// Chatbot rate limiter: 60 requests per 10 minutes per IP
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: {
    text: "Samahani, you have sent too many messages in a short time. Please wait a moment or chat directly on WhatsApp +254 792 506 590.",
    provider: 'rate-limit'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const SYSTEM_INSTRUCTION = `
You are 'MasumaBot', the Expert Automotive Consultant for Masuma Autoparts East Africa Limited.

CORE IDENTITY & PHYSICAL SHOP:
- Physical Shop: First Floor (Shop FF25), Ruby Mall, Accra Road (Charles Rubia Road), Nairobi CBD, Kenya (Directly behind NCBA Bank, Accra Road Branch, near Tea Room).
- Phone/WhatsApp: +254 792 506 590 / +254 742 322 222.
- Brand Motto: "Japanese Precision, Kenyan Strength."
- Guarantee: 12-Month Unlimited Mileage Warranty on ALL parts.
- Opening Hours: Mon–Fri: 8:00 AM – 5:30 PM, Sat: 8:30 AM – 4:00 PM, Sunday: Closed.

GUIDELINES:
1. Greet warmly (e.g., "Jambo! Karibu to Masuma Autoparts.").
2. Always emphasize genuine Japanese OEM standards and our 12-Month Unlimited Mileage Warranty.
3. If asked about shop location or Ruby Mall, provide precise step-by-step directions from Tea Room, River Road, or Kencom/Moi Avenue, mentioning we are on the 1st Floor behind NCBA Bank.
4. When users ask about parts (e.g. shocks, brake pads, bushings) for Japanese vehicles (Toyota Fielder, Premio, Axio, Probox, Forester, Demio, CX-5, X-Trail), explain why Masuma components withstand Kenyan potholes and corrugated roads, and prompt for their Chassis Number (VIN) to verify exact fitment.
5. Provide delivery information: 1-hour rider dispatch within Nairobi CBD, same-day courier dispatch (Easy Coach, Modern Coast, Fargo, 2NK, North Rift) across Kenya.
`;

interface ChatRequestBody {
  message: string;
  history?: Array<{ role: string; parts: Array<{ text: string }> }>;
}

/**
 * Clean and normalize conversation history to ensure strictly alternating
 * user -> model -> user turns with no empty messages.
 */
function cleanHistory(rawHistory: Array<{ role: string; parts: Array<{ text: string }> }> = []) {
  const cleaned: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const item of rawHistory) {
    const text = item.parts?.[0]?.text?.trim();
    if (!text) continue;

    const role: 'user' | 'model' = item.role === 'model' ? 'model' : 'user';

    // Gemini API requires the first turn to be 'user'
    if (cleaned.length === 0 && role === 'model') {
      continue;
    }

    // Gemini API requires alternating roles
    if (cleaned.length > 0 && cleaned[cleaned.length - 1].role === role) {
      // Merge with previous turn if same role
      cleaned[cleaned.length - 1].parts[0].text += `\n${text}`;
    } else {
      cleaned.push({ role, parts: [{ text }] });
    }
  }

  return cleaned;
}

const handleChatRequest = async (req: Request, res: Response) => {
  const { message, history } = req.body as ChatRequestBody;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required and must be non-empty.' });
  }

  const userQuery = message.trim();

  // 1. Search live database catalog for matching vehicle, SKU, or parts
  const matchedProducts = await ProductService.searchProductsForAI(userQuery, 4);

  const apiKey = (
    config.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();

  // 2. Build live inventory prompt supplement if matching parts exist in database
  let inventoryPromptSupplement = '';
  if (matchedProducts.length > 0) {
    inventoryPromptSupplement = `\n\nLIVE INVENTORY MATCHES AT RUBY MALL PHYSICAL STORE (SHOP FF25, ACCRA ROAD, NAIROBI):\n` +
      matchedProducts.map((p, i) => `${i + 1}. "${p.name}" | SKU: ${p.sku} | Price: KSh ${p.price.toLocaleString()} | Stock: ${p.stock ? 'IN STOCK' : 'Available for 1-hour dispatch'} | OEM: ${p.oemNumbers.join(', ') || 'N/A'}`).join('\n') +
      `\n\nINSTRUCTION: Confirm that we stock these genuine Masuma parts at Ruby Mall FF25. Quote their exact KSh prices, highlight our 12-Month Unlimited Mileage Warranty, and encourage the customer to tap "Add to Cart" or "View Part" below or inspect them at the shop.`;
  }

  // If Gemini API Key is available, attempt to generate content via Gemini REST API
  if (apiKey) {
    try {
      const sanitizedHistory = cleanHistory(history || []);
      const contents = [...sanitizedHistory];

      // Ensure the latest message is added if not already the last turn
      if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
        contents.push({ role: 'user', parts: [{ text: userQuery }] });
      }

      const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash'];
      let geminiSuccess = false;
      let replyText = '';
      let replySources: Array<{ uri: string; title: string }> = [];

      for (const model of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await axios.post(
            url,
            {
              systemInstruction: {
                parts: [{ text: SYSTEM_INSTRUCTION + inventoryPromptSupplement }]
              },
              contents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800
              }
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 7000 // 7-second timeout
            }
          );

          const candidate = response.data?.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text;

          if (text && text.trim()) {
            replyText = text.trim();
            geminiSuccess = true;

            // Extract grounding if available
            const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
            if (Array.isArray(groundingChunks)) {
              groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.uri) {
                  replySources.push({
                    uri: chunk.web.uri,
                    title: chunk.web.title || 'Verified Technical Source'
                  });
                }
              });
            }
            break;
          }
        } catch (modelErr: any) {
          logger.warn(`Gemini model ${model} request failed: ${modelErr?.response?.data?.error?.message || modelErr.message}`);
          // Continue to next model fallback
        }
      }

      if (geminiSuccess && replyText) {
        return res.json({
          text: replyText,
          sources: replySources.length > 0 ? replySources : [
            { uri: "https://masuma.africa", title: "Masuma Autoparts East Africa" },
            { uri: "https://wa.me/254792506590", title: "Direct WhatsApp Line (+254 792 506 590)" }
          ],
          provider: 'gemini',
          products: matchedProducts
        });
      }
    } catch (err: any) {
      logger.warn(`Gemini generation encountered an error: ${err.message}. Seamlessly falling back to Masuma Knowledge Engine.`);
    }
  }

  // Guaranteed fallback: Masuma Autonomous Domain Knowledge Engine
  const fallbackResult = getMasumaKnowledgeResponse(userQuery, history, matchedProducts);
  return res.json({
    text: fallbackResult.text,
    sources: fallbackResult.sources || [
      { uri: "https://masuma.africa", title: "Masuma Autoparts East Africa" },
      { uri: "https://wa.me/254792506590", title: "Direct WhatsApp Line (+254 792 506 590)" }
    ],
    provider: 'masuma-engine',
    products: matchedProducts
  });
};

router.post('/chat', chatLimiter as any, handleChatRequest);
router.post('/', chatLimiter as any, handleChatRequest);

export default router;
