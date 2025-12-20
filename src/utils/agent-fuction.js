import runAgent, { generateImageAgent } from './gemini-client.js';

// Delay helper
const breathe = () => new Promise(r => setTimeout(r, 2000)); // Increased to 2s for safety

async function ideaPipeline(userPrompt, io, roomId, imageParts = []) {
    console.log("🚀 Starting Idea Pipeline with Gemini 2.5 Flash...");
    if (io && roomId) io.to(roomId).emit('pipeline_start', { message: 'Starting process...' });

    // Check for Image Generation Intent
    const imageKeywords = ['generate image', 'create image', 'draw', 'imagine'];
    const isImageRequest = imageKeywords.some(keyword => userPrompt.toLowerCase().includes(keyword));

    if (isImageRequest && imageParts.length === 0) {
        console.log("🎨 Image Generation Intent Detected");
        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'image_gen', content: 'Generating Image...' });

        const imageUrl = await generateImageAgent(userPrompt);

        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'final_output', content: `Here is your generated image: ![Generated Image](${imageUrl})` });
        return { finalOutput: `![Generated Image](${imageUrl})` };
    }

    // 1. Idea (Multimodal)
    const ideas = await runAgent(`Generate 3 creative ideas or descriptions for: "${userPrompt}"`, imageParts);
    console.log("✅ Ideas generated");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'ideas', content: ideas });
    await breathe();

    // 2. Critic
    const critiques = await runAgent(`Critique these ideas briefly:\n${ideas}`);
    console.log("✅ Critiques generated");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'critiques', content: critiques });
    await breathe();

    // 3. Refiner
    const refinedIdeas = await runAgent(`Refine these ideas based on critiques:\nIdeas: ${ideas}\nCritiques: ${critiques}`);
    console.log("✅ Ideas refined");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'refined_ideas', content: refinedIdeas });
    await breathe();

    // 4. Presenter
    const finalOutput = await runAgent(`Format this into a final report:\n${refinedIdeas}`);
    console.log("✅ Final output generated");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'final_output', content: finalOutput });

    return { ideas, critiques, refinedIdeas, finalOutput };
}

export default ideaPipeline;