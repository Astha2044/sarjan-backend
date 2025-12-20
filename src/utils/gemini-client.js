import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// // --- TEXT GENERATION AGENT (Fallback logic from previous steps) ---
// const TEXT_MODELS = [
//     "gemini-1.5-pro-002",   // Best for paid accounts
//     "gemini-1.5-flash-002", // Faster backup
// ];
const TEXT_MODELS = [
    "gemini-3-flash-preview",   // 1. Newest (Dec 2025) - Fast & Smart
    "gemini-2.5-flash-lite",    // 2. High Quota (1,500/day) - Best for free tier
    "gemini-2.5-flash",         // 3. Standard - Good quality, strict limits
    "gemini-2.0-flash-exp"      // 4. Old Faithful - Last resort backup
];

async function runAgent(prompt, imageParts = []) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    for (const modelName of TEXT_MODELS) {
        try {
            console.log(`🤖 Attempting text with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const input = imageParts.length > 0 ? [prompt, ...imageParts] : [prompt];

            const result = await model.generateContent(input);
            console.log(`✅ Success with ${modelName}`);
            return result.response.text();

        } catch (error) {
            console.warn(`⚠️ Failed with ${modelName}: ${error.message}`);
            if (error.status === 429) {
                await delay(2000);
                continue;
            }
            // If 404 or non-transient error, move to next model immediately
            if (error.status === 404 || error.status === 403) continue;
        }
    }
    throw new Error("❌ All AI text models failed.");
}

// --- 🎨 GEMINI 3 PRO IMAGE AGENT ---
export async function generateImageAgent(prompt, history = []) {
    try {
        console.log(`🎨 Visualizing with Gemini 3 Pro for: "${prompt.substring(0, 30)}..."`);

        const apiKey = process.env.GEMINI_API_KEY;
        const modelId = "gemini-2.5-flash-image";

        // Use the v1beta endpoint which hosts the preview models
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

        // Gemini 3 Pro supports "Thinking" for images to better understand layout/lighting
        // We construct a multi-turn-like payload if history exists, or just a single prompt.
        const contents = [
            ...history,
            { role: "user", parts: [{ text: prompt }] }
        ];

        const requestBody = {
            contents: contents,
            generationConfig: {
                responseModalities: ["IMAGE"], // Force image output
                // Gemini 3 specific parameters
                temperature: 0.9,
                candidateCount: 1
            }
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini 3 API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // Parse Gemini 3 Response
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts;
        const imagePart = parts?.find(p => p.inlineData && p.inlineData.mimeType.startsWith('image'));

        if (imagePart) {
            console.log("✅ Image generated (Gemini 3 Pro).");
            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        } else {
            // Sometimes Gemini 3 will refuse and output text (safety refusal)
            const textPart = parts?.find(p => p.text);
            if (textPart) console.warn("⚠️ Model Refusal:", textPart.text);
            throw new Error("Model returned text instead of an image.");
        }

    } catch (error) {
        console.error("❌ Gemini 3 Generation Failed:", error.message);
        // Fallback to standard placeholder
        return `https://placehold.co/800x450/2A2A2A/FFF?font=montserrat&text=${encodeURIComponent("Preview Model Unavailable")}`;
    }
}
export default runAgent;