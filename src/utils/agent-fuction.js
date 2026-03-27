import runAgent, { generateImageAgent, runStreamingAgent } from './gemini-client.js';

// Delay helper (No longer used in the fast pipeline, but kept for reference)
const breathe = () => new Promise(r => setTimeout(r, 2000));

async function ideaPipeline(userPrompt, io, roomId, imageParts = [], checkStop, historyContext = '', userPlan = 'free') {
    console.log("⚡ Starting Multi-Agent AI Pipeline...");
    if (io && roomId) io.to(roomId).emit('pipeline_start', { message: 'Thinking...' });
    if (checkStop && checkStop()) throw new Error('STOPPED');

    // 1. Check for Image Generation Intent (Comprehensive regex for natural language)
    const imageRegex = /generate|create|make|draw|imagine|paint|sketch|visualize|show me|picture of|photo of|portrait of|illustration of|artwork of/i;
    const isImageRequest = imageRegex.test(userPrompt);

    let finalOutput;

    if (isImageRequest) {
        if (userPlan !== 'pro') {
            const restrictionMsg = "🎨 **Image generation is a Pro feature.** Please upgrade to Pro to generate images with AI.";
            if (io && roomId) io.to(roomId).emit('pipeline_step', {
                step: 'restriction',
                content: "🎨 Image generation is a Pro feature. Please upgrade to unleash your full creativity!"
            });
            return {
                finalOutput: restrictionMsg,
                restricted: true
            };
        }
        console.log("🎨 Image Flow Detected");

        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'idea_agent', content: 'Brainstorming visual concepts...' });
        if (checkStop && checkStop()) throw new Error('STOPPED');

        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'refiner_agent', content: 'Crafting the perfect image prompt...' });

        const executorPrompt = `Role: "Prompt Engineer". Task: Write a single, highly detailed image generation prompt based on this user request. Describe subject, lighting, camera angle, and art style. Output ONLY the raw prompt text.\nUser Request: "${userPrompt}"`;
        const finalContent = await runAgent(executorPrompt);
        if (checkStop && checkStop()) throw new Error('STOPPED');

        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'presenter_agent', content: 'Generating your image...' });

        const imageUrl = await generateImageAgent(finalContent);
        finalOutput = `![Generated Image](${imageUrl})\n\n**Prompt Used:**\n> ${finalContent}`;

        console.log("✅ Image generated via pipeline");
        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'final_output', content: finalOutput });

        return { finalContent, finalOutput };

    } else {
        console.log("🧠 Text Flow Detected - Fast Mode");

        // Use a short helper to simulate the "process" quickly
        const emitStep = (step, content, delayMs = 150) => {
            if (io && roomId) io.to(roomId).emit('pipeline_step', { step, content });
            return new Promise(r => setTimeout(r, delayMs));
        };

        // --- STAGE 1: IDEA AGENT (Fast simulation) ---
        await emitStep('idea_agent', 'Conceptualizing the best approach...');
        if (checkStop && checkStop()) throw new Error('STOPPED');

        // --- STAGE 2: CRITIC AGENT (Fast simulation) ---
        await emitStep('critic_agent', 'Validating logic and structure...');
        if (checkStop && checkStop()) throw new Error('STOPPED');

        // --- STAGE 3: REFINER AGENT (Fast simulation) ---
        await emitStep('refiner_agent', 'Polishing final response...');
        if (checkStop && checkStop()) throw new Error('STOPPED');

        // --- STAGE 4: PRESENTER AGENT (Real-time Streaming) ---
        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'presenter_agent', content: 'Delivering report...' });
        
        const finalPrompt = `User Request: "${userPrompt}"\n${historyContext ? `Context:\n${historyContext}` : ''}\nOutput: Provide a helpful, complete, and formatted response using markdown.`;
        
        finalOutput = await runStreamingAgent(finalPrompt, imageParts, (chunk) => {
            if (io && roomId) {
                io.to(roomId).emit('content_chunk', { chunk });
            }
        });

        if (checkStop && checkStop()) throw new Error('STOPPED');

        console.log("✅ Text response generated and streamed");
        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'final_output', content: finalOutput });

        return { finalOutput };
    }
}

export default ideaPipeline;