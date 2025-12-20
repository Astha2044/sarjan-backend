import runAgent from './gemini-client.js';

// Delay helper
const breathe = () => new Promise(r => setTimeout(r, 2000)); // Increased to 2s for safety

async function ideaPipeline(userPrompt, io, roomId, checkStop) {
    if (checkStop && checkStop()) throw new Error('STOPPED');
    console.log("🚀 Starting Idea Pipeline with Gemini 2.5 Flash...");
    if (io && roomId) io.to(roomId).emit('pipeline_start', { message: 'Starting Idea Pipeline...' });

    // 1. Idea
    if (checkStop && checkStop()) throw new Error('STOPPED');
    const ideas = await runAgent(`Generate 3 creative ideas for: "${userPrompt}"`);
    console.log("✅ Ideas generated");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'ideas', content: ideas });
    if (checkStop && checkStop()) throw new Error('STOPPED');
    await breathe();

    // 2. Critic
    if (checkStop && checkStop()) throw new Error('STOPPED');
    const critiques = await runAgent(`Critique these ideas briefly:\n${ideas}`);
    console.log("✅ Critiques generated");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'critiques', content: critiques });
    if (checkStop && checkStop()) throw new Error('STOPPED');
    await breathe();

    // 3. Refiner
    if (checkStop && checkStop()) throw new Error('STOPPED');
    const refinedIdeas = await runAgent(`Refine these ideas based on critiques:\nIdeas: ${ideas}\nCritiques: ${critiques}`);
    console.log("✅ Ideas refined");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'refined_ideas', content: refinedIdeas });
    if (checkStop && checkStop()) throw new Error('STOPPED');
    await breathe();

    // 4. Presenter
    if (checkStop && checkStop()) throw new Error('STOPPED');
    const finalOutput = await runAgent(`Format this into a final report:\n${refinedIdeas}`);
    console.log("✅ Final output generated");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'final_output', content: finalOutput });

    return { ideas, critiques, refinedIdeas, finalOutput };
}

export default ideaPipeline;