// server.ts
import express from "express";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var port = parseInt(process.env.PORT || "3000", 10);
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
var syncStore = {};
var apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("[Vexo-AI] Warning: GEMINI_API_KEY environment variable is not set. API calls will fail until configured.");
}
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var DEFAULT_SYSTEM_INSTRUCTION = `You are Vexo (vexo-Ai), a next-generation multimodal artificial intelligence created by Vexo Systems.
You possess cutting-edge capabilities in reasoning, coding, writing, mathematical analysis, and creative problem solving.
You have real-time access to the live web, vision analysis capabilities, and audio voice interaction.
Your personality is helpful, direct, intelligent, witty, articulate, and respectful.
Always provide clean, accurate, and beautifully structured markdown responses.

CRITICAL IDENTITY RULES:
- Your name is Vexo (or vexo-Ai).
- You are powered by the Vexo Neural Engine v4.9 developed by Vexo Systems.
- NEVER mention Gemini, Google, OpenAI, ChatGPT, Anthropic, or any external AI model or company as your creator or identity.
- If asked who made you or what model you are, state that you are Vexo (vexo-Ai), an advanced multimodal intelligence developed by Vexo Systems.
- You have real-time web browsing enabled when answering questions that require live, recent, or factual information.`;
app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    engine: "vexo-neural-v4.9",
    multimodal: true,
    webBrowsing: true,
    voiceEnabled: true,
    timestamp: Date.now()
  });
});
app.post("/api/chat", async (req, res) => {
  try {
    const {
      messages,
      systemPrompt,
      enableWebSearch = true,
      reasoningDepth = "medium",
      // 'low' | 'medium' | 'high'
      temperature,
      model = "gemini-3.8-flash"
    } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Vexo API key is not configured. Please ensure GEMINI_API_KEY is provided in settings."
      });
    }
    const contents = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const role = msg.role === "user" ? "user" : "model";
      const parts = [];
      if (msg.image && msg.image.data && msg.image.mimeType) {
        parts.push({
          inlineData: {
            data: msg.image.data,
            mimeType: msg.image.mimeType
          }
        });
      }
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      contents.push({
        role,
        parts: parts.length > 0 ? parts : [{ text: " " }]
      });
    }
    let fullSystemInstruction = DEFAULT_SYSTEM_INSTRUCTION;
    if (systemPrompt && typeof systemPrompt === "string" && systemPrompt.trim()) {
      fullSystemInstruction += `

User Custom Persona & Preferences:
${systemPrompt.trim()}`;
    }
    const config = {
      systemInstruction: fullSystemInstruction
    };
    if (enableWebSearch) {
      config.tools = [{ googleSearch: {} }];
    }
    if (reasoningDepth === "high") {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    } else if (reasoningDepth === "low") {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    } else {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.MEDIUM };
    }
    const activeModel = "gemini-3.8-flash";
    const response = await ai.models.generateContent({
      model: activeModel,
      contents,
      config
    });
    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSearchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];
    const sources = [];
    for (const chunk of groundingChunks) {
      if (chunk.web && chunk.web.uri) {
        let domain = "";
        try {
          const parsed = new URL(chunk.web.uri);
          domain = parsed.hostname.replace("www.", "");
        } catch {
          domain = "Web Source";
        }
        sources.push({
          title: chunk.web.title || domain,
          url: chunk.web.uri,
          domain
        });
      }
    }
    const uniqueSources = sources.filter(
      (s, index, self) => index === self.findIndex((t) => t.url === s.url)
    );
    return res.json({
      content: text,
      sources: uniqueSources,
      searchQueries: webSearchQueries,
      usedWebSearch: uniqueSources.length > 0 || webSearchQueries.length > 0
    });
  } catch (error) {
    console.error("[Vexo-AI Chat Error]:", error);
    const errorMessage = error?.message || "An error occurred while generating a response from Vexo.";
    return res.status(500).json({ error: errorMessage });
  }
});
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio = "1:1" } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required for image generation." });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Vexo API key is not configured." });
    }
    const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    const chosenAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            text: `High quality, detailed, visually stunning artwork: ${prompt}`
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: chosenAspectRatio
        }
      }
    });
    let imageUrl = "";
    let caption = "";
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || "image/png";
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        caption += part.text;
      }
    }
    if (!imageUrl) {
      return res.status(500).json({
        error: "Vexo Vision could not generate an image from this prompt. Please try modifying your request.",
        details: caption
      });
    }
    return res.json({
      imageUrl,
      prompt,
      aspectRatio: chosenAspectRatio,
      caption: caption.trim() || void 0
    });
  } catch (error) {
    console.error("[Vexo Image Generation Error]:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate image with Vexo Vision."
    });
  }
});
app.post("/api/sync/push", (req, res) => {
  const { syncCode, conversations, settings } = req.body;
  if (!syncCode || typeof syncCode !== "string") {
    return res.status(400).json({ error: "Sync code is required." });
  }
  const cleanCode = syncCode.trim().toUpperCase();
  syncStore[cleanCode] = {
    conversations: conversations || [],
    settings: settings || {},
    updatedAt: Date.now()
  };
  return res.json({
    success: true,
    syncCode: cleanCode,
    updatedAt: syncStore[cleanCode].updatedAt
  });
});
app.get("/api/sync/pull/:syncCode", (req, res) => {
  const syncCode = req.params.syncCode?.trim().toUpperCase();
  if (!syncCode || !syncStore[syncCode]) {
    return res.status(404).json({ error: "Sync session not found or expired." });
  }
  return res.json({
    success: true,
    data: syncStore[syncCode]
  });
});
async function startServer() {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
  app.listen(port, "0.0.0.0", () => {
    console.log(`[Vexo-AI] Server running on port ${port} in ${isDev ? "development" : "production"} mode`);
  });
}
startServer().catch((err) => {
  console.error("[Vexo-AI] Server startup error:", err);
  process.exit(1);
});
