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
            console.log(` Attempting text with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const input = imageParts.length > 0 ? [prompt, ...imageParts] : [prompt];

            const result = await model.generateContent(input);
            console.log(` Success with ${modelName}`);
            return result.response.text();

        } catch (error) {
            console.warn(` Failed with ${modelName}: ${error.message}`);
            if (error.status === 429) {
                await delay(2000);
                continue;
            }
            // If 404 or non-transient error, move to next model immediately
            if (error.status === 404 || error.status === 403) continue;
        }
    }
    throw new Error(" All AI text models failed.");
}

export async function runStreamingAgent(prompt, imageParts = [], onChunk) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    for (const modelName of TEXT_MODELS) {
        try {
            console.log(` Attempting streaming with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const input = imageParts.length > 0 ? [prompt, ...imageParts] : [prompt];

            const result = await model.generateContentStream(input);
            let fullText = "";

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullText += chunkText;
                if (onChunk) onChunk(chunkText);
            }

            console.log(` Success with ${modelName} (streaming)`);
            return fullText;

        } catch (error) {
            console.warn(` Failed with ${modelName} (streaming): ${error.message}`);
            if (error.status === 429) {
                await delay(2000);
                continue;
            }
            if (error.status === 404 || error.status === 403) continue;
        }
    }
    throw new Error(" All AI text models failed in streaming mode.");
}

// ---  DEAPI IMAGE AGENT (Flux Model) ---
export async function generateImageAgent(prompt, history = []) {
    try {
        console.log(` Visualizing with DeAPI for: "${prompt.substring(0, 30)}..."`);

        const apiKey = process.env.DEAPI_API_KEY;
        const submitUrl = 'https://api.deapi.ai/api/v1/client/txt2img';

        const requestBody = {
            prompt: prompt,
            model: "Flux_2_Klein_4B_BF16",
            width: 768,
            height: 768,
            seed: Math.floor(Math.random() * 2000000000),
            steps: 4
        };

        const submitResponse = await fetch(submitUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "accept": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!submitResponse.ok) {
            const errorText = await submitResponse.text();
            throw new Error(`DeAPI Submit Error ${submitResponse.status}: ${errorText}`);
        }

        const submitData = await submitResponse.json();
        const requestId = submitData.data?.request_id || submitData.request_id;

        if (!requestId) {
            throw new Error(`No request_id returned from DeAPI. Response: ${JSON.stringify(submitData)}`);
        }

        console.log(` Job submitted. ID: ${requestId}`);

        // Polling loop
        const statusUrl = `https://api.deapi.ai/api/v1/client/request-status/${requestId}`;
        let attempts = 0;
        const maxAttempts = 30; // 30 * 2s = 60s

        while (attempts < maxAttempts) {
            attempts++;
            await delay(2000);

            const statusResponse = await fetch(statusUrl, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "accept": "application/json"
                }
            });

            if (!statusResponse.ok) {
                console.warn(` Polling error ${statusResponse.status}. Retrying...`);
                continue;
            }

            const rawStatusData = await statusResponse.json();
            const statusData = rawStatusData.data || rawStatusData;
            const status = statusData.status?.toLowerCase() || statusData.state?.toLowerCase();

            if (status === 'done' || status === 'completed' || status === 'success') {
                const imageUrl = statusData.result_url || (statusData.results_alt_formats && statusData.results_alt_formats[0]?.url);
                if (imageUrl) {
                    console.log(" Image generated (DeAPI).");
                    return imageUrl;
                }
                throw new Error("Job completed but no image URL found in response.");
            }

            if (status === 'error' || status === 'failed') {
                throw new Error(`DeAPI Job Failed: ${statusData.message || 'Unknown error'}`);
            }

            console.log(` Polling... status: ${status} (attempt ${attempts})`);
        }

        throw new Error("DeAPI job timed out after 60 seconds.");

    } catch (error) {
        console.error("Image Generation Failed:", error.message);
        // Fallback to standard placeholder with actual error for debugging
        const shortError = error.message.split('\n')[0].substring(0, 100);
        return `https://placehold.co/800x450/2A2A2A/FFF?font=montserrat&text=${encodeURIComponent("Error: " + shortError)}`;
    }
}
export default runAgent;