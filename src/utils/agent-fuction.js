import runAgent from './gemini-client.js';

// Delay helper
const breathe = () => new Promise(r => setTimeout(r, 2000)); // Increased to 2s for safety

async function ideaPipeline(userPrompt, io, roomId) {
    console.log("🚀 Starting Idea Pipeline with Gemini 2.5 Flash...");
    if (io && roomId) io.to(roomId).emit('pipeline_start', { message: 'Starting Idea Pipeline...' });

    // 1. Idea
    const ideas = await runAgent(`Generate 3 creative ideas for: "${userPrompt}"`);
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