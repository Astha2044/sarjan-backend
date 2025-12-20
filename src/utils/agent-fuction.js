import runAgent, { generateImageAgent } from './gemini-client.js';

// Delay helper
const breathe = () => new Promise(r => setTimeout(r, 2000)); // Increased to 2s for safety

async function ideaPipeline(userPrompt, io, roomId, imageParts = [], checkStop, historyContext = '') {
    console.log("🚀 Starting Multi-Agent Creative Studio with Gemini...");
    if (io && roomId) io.to(roomId).emit('pipeline_start', { message: 'Inking the canvas...' });
    if (checkStop && checkStop()) throw new Error('STOPPED');


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

    // --- AGENT 1: IDEA AGENT ---
    if (checkStop && checkStop()) throw new Error('STOPPED');
    console.log("💡 [1/4] Idea Agent Working...");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'idea_agent', content: 'Idea Agent is brainstorming 3 creative concepts...' });

    const ideaPrompt = `Role: You are the "Idea Agent".
Task: Generate 3 distinct, creative, and innovative concepts or ideas based on the user's request: "${userPrompt}".
${historyContext ? `Context from previous conversation:\n${historyContext}` : ''}
Output: A list of 3 concepts with brief descriptions.`;
    const ideas = await runAgent(ideaPrompt, imageParts);
    console.log("✅ Ideas generated");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'ideas', content: ideas });

    await breathe();


    // --- AGENT 2: SELECTOR AGENT (CRITIC & SELECTOR) ---
    if (checkStop && checkStop()) throw new Error('STOPPED');
    console.log("🧐 [2/4] Selector Agent Working...");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'critic_agent', content: 'Selector Agent is reviewing ideas to pick the best one...' });

    const selectorPrompt = `Role: You are the "Selector Agent".
Task: Analyze the provided ideas. Select the ONE best idea that most effectively addresses the user's request. Provide a brief critique/reasoning for the selection and any improvements needed.
User Request: "${userPrompt}"
Generated Ideas:
${ideas}
Output: 
1. The Selected Idea Title.
2. Reasoning for selection.
3. List of specific improvements/refinements for the next step.`;
    const selectedConcept = await runAgent(selectorPrompt);
    console.log("✅ Best idea selected");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'critiques', content: selectedConcept });

    await breathe();


    // --- AGENT 3: EXECUTOR AGENT (REFINER & CREATOR) ---
    if (checkStop && checkStop()) throw new Error('STOPPED');
    console.log("🔧 [3/4] Executor Agent Working...");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'refiner_agent', content: 'Executor Agent is generating the final content...' });

    const executorPrompt = `Role: You are the "Executor Agent".
Task: Take the "Selected Idea" and the "Improvements" and generate the FINAL, COMPLETE output requested by the user. 
- Do not just summarize.
- Create the actual content (e.g., if asked for a blog, write the blog; if asked for a code solution, write the code; if asked for a strategy, write the detailed strategy).
User Request: "${userPrompt}"
Selected Idea & Critique:
${selectedConcept}
${historyContext ? `Context from previous conversation:\n${historyContext}` : ''}
Output: The full, detailed, and refined final content.`;
    const finalContent = await runAgent(executorPrompt);
    console.log("✅ Final content generated");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'refined_ideas', content: finalContent });

    await breathe();


    // --- AGENT 4: PRESENTER AGENT ---
    if (checkStop && checkStop()) throw new Error('STOPPED');
    console.log("🎤 [4/4] Presenter Agent Working...");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'presenter_agent', content: 'Presenter Agent is compiling the final report...' });

    const presenterPrompt = `Role: You are the "Presenter Agent".
Task: Format the final content into a professional, well-structured layout using Markdown.
- Ensure headings, bullet points, and sections are clear.
- Do not change the core substance of the content, just format it beautifully.
Final Content:
${finalContent}
Output: The final formatted response.`;
    const finalOutput = await runAgent(presenterPrompt);
    console.log("✅ Final output generated");

    // Final emission
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'final_output', content: finalOutput });

    return { ideas, selectedConcept, finalContent, finalOutput };
}

export default ideaPipeline;