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
    // "gemini-3-flash-preview",   // 1. Newest (Dec 2025) - Fast & Smart
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


// --- 🎨 IMAGE GENERATION AGENT (Real Implementation) ---
// This requires a paid/Pro Google AI Studio account.
export async function generateImageAgent(prompt) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // The specific model for generating images
    const imagenModel = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

    try {
        console.log(`🎨 Generating image with Imagen 3 for: "${prompt.substring(0, 30)}..."`);

        // Note: The method is generateImages, not generateContent
        const result = await imagenModel.generateImages({
            prompt: prompt,
            numberOfImages: 1, // You can request up to 4
            // aspectRatio: "16:9", // Optional: "1:1", "9:16", etc.
            // safetySettings: [ ... ] // Optional
        });

        // The API returns Base64 encoded image data
        const image = result.response.images[0];

        if (!image || !image.image64) {
            throw new Error("No image data received from API.");
        }

        console.log("✅ Image generated successfully.");

        // Convert Base64 to a Data URL so it can be displayed immediately in frontend
        // Alternatively, you could save this base64 string to a file on your server.
        const base64DataUrl = `data:image/png;base64,${image.image64}`;

        return base64DataUrl;

    } catch (error) {
        console.error("❌ Imagen 3 Generation Failed:", error.message);

        // Important: If your Pro account doesn't have access yet, 
        // fall back to the placeholder so the app doesn't crash.
        console.log("🔄 Returning fallback placeholder image.");
        return `https://placehold.co/600x400?text=${encodeURIComponent("Image Gen Failed")}`;
    }
}

export default runAgent;