import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

// Helper to delay execution (prevents 429 errors)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runAgent(prompt) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // ✅ FIXED: Using the current standard free-tier model (Dec 2025)
    // "gemini-2.5-pro" has no free tier (limit 0).
    // "gemini-1.5-*" is retired (404).
    const modelString = "gemini-2.5-flash";

    try {
        const model = genAI.getGenerativeModel({ model: modelString });
        const result = await model.generateContent(prompt);
        return result.response.text();

    } catch (error) {
        // If we hit a rate limit (429), wait and retry once
        if (error.response?.status === 429 || error.status === 429 || error.message.includes('429')) {
            console.warn(`⚠️ Rate limit hit on ${modelString}. Waiting 5s to retry...`);
            await delay(5000); // Wait 5 seconds

            try {
                // Retry same model
                const model = genAI.getGenerativeModel({ model: modelString });
                const result = await model.generateContent(prompt);
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

export default runAgent;