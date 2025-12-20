import runAgent from './gemini-client.js';

// Delay helper
const breathe = () => new Promise(r => setTimeout(r, 2000)); // Increased to 2s for safety

async function ideaPipeline(userPrompt) {
    console.log("🚀 Starting Idea Pipeline with Gemini 2.5 Flash...");

    // 1. Idea
    const ideas = await runAgent(`Generate 3 creative ideas for: "${userPrompt}"`);
    console.log("✅ Ideas generated");
    await breathe();

    // 2. Critic
    const critiques = await runAgent(`Critique these ideas briefly:\n${ideas}`);
    console.log("✅ Critiques generated");
    await breathe();

    // 3. Refiner
    const refinedIdeas = await runAgent(`Refine these ideas based on critiques:\nIdeas: ${ideas}\nCritiques: ${critiques}`);
    console.log("✅ Ideas refined");
    await breathe();

    // 4. Presenter
    const finalOutput = await runAgent(`Format this into a final report:\n${refinedIdeas}`);
    console.log("✅ Final output generated");

    return { ideas, critiques, refinedIdeas, finalOutput };
}

export default ideaPipeline;