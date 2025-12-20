import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

// Helper to delay execution (prevents 429 errors)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runAgent(prompt, imageParts = []) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelString = "gemini-2.5-flash"; // Supports multimodal

    try {
        const model = genAI.getGenerativeModel({ model: modelString });

        const input = [prompt, ...imageParts];
        const result = await model.generateContent(input);
        return result.response.text();

    } catch (error) {
        // If we hit a rate limit (429), wait and retry once
        if (error.response?.status === 429 || error.status === 429 || error.message.includes('429')) {
            console.warn(`⚠️ Rate limit hit on ${modelString}. Waiting 5s to retry...`);
            await delay(5000);

            try {
                // Retry same model
                const model = genAI.getGenerativeModel({ model: modelString });
                const input = [prompt, ...imageParts];
                const result = await model.generateContent(input);
                return result.response.text();
            } catch (retryError) {
                console.error(`❌ Retry failed for ${modelString}.`);
                throw retryError;
            }
        }

        console.error("Error in runAgent:", error.message);
        throw error;
    }
}

export async function generateImageAgent(prompt) {
    // Placeholder implementation or real call if API key supports Imagen
    return `https://placehold.co/600x400?text=${encodeURIComponent(prompt)}`;
}

export default runAgent;