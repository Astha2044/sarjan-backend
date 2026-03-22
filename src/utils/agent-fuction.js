import runAgent, { generateImageAgent } from './gemini-client.js';

// Delay helper (No longer used in the fast pipeline, but kept for reference)
const breathe = () => new Promise(r => setTimeout(r, 2000));

async function ideaPipeline(userPrompt, io, roomId, imageParts = [], checkStop, historyContext = '', userPlan = 'free') {
    console.log("⚡ Starting Fast AI Pipeline...");
    if (io && roomId) io.to(roomId).emit('pipeline_start', { message: 'Thinking...' });
    if (checkStop && checkStop()) throw new Error('STOPPED');

    // 1. Check for Image Generation Intent
    const imageRegex = /(generate|create|make).*(image|picture|photo|art)|draw|imagine|picture of/i;
    const isImageRequest = imageRegex.test(userPrompt) || imageParts.length > 0;

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
        
        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'refiner_agent', content: 'Crafting the perfect image prompt...' });
        
        const executorPrompt = `Role: "Prompt Engineer". Task: Write a single, highly detailed image generation prompt based on this user request. Describe subject, lighting, camera angle, and art style. Output ONLY the raw prompt text.\nUser Request: "${userPrompt}"`;
        const finalContent = await runAgent(executorPrompt);
        if (checkStop && checkStop()) throw new Error('STOPPED');

        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'presenter_agent', content: 'Generating your image...' });
        
        const imageUrl = await generateImageAgent(finalContent);
        finalOutput = `![Generated Image](${imageUrl})\n\n**Prompt Used:**\n> ${finalContent}`;
        
        console.log("✅ Fast Image generated via pipeline");
        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'final_output', content: finalOutput });
        
        return { finalContent, finalOutput };
        
    } else {
        console.log("🧠 Text Flow Detected");
        
        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'idea_agent', content: 'Formulating response...' });
        
        const prompt = `User Request: "${userPrompt}"\n${historyContext ? `Context from previous conversation:\n${historyContext}` : ''}\nOutput: Provide a helpful, complete, and formatted response.`;
        finalOutput = await runAgent(prompt, imageParts);
        if (checkStop && checkStop()) throw new Error('STOPPED');

        console.log("✅ Fast Text response generated");
        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'final_output', content: finalOutput });

        return { finalOutput };
    }
}

export default ideaPipeline;