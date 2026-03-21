import runAgent, { generateImageAgent } from './gemini-client.js';

// Delay helper
const breathe = () => new Promise(r => setTimeout(r, 2000));

async function ideaPipeline(userPrompt, io, roomId, imageParts = [], checkStop, historyContext = '', userPlan = 'free') {
    console.log("🚀 Starting Multi-Agent Creative Studio with Gemini...");
    if (io && roomId) io.to(roomId).emit('pipeline_start', { message: 'Inking the canvas...' });
    if (checkStop && checkStop()) throw new Error('STOPPED');

    // 1. Check for Image Generation Intent
    const imageRegex = /(generate|create|make).*(image|picture|photo|art)|draw|imagine|picture of/i;
    const isImageRequest = imageRegex.test(userPrompt) || imageParts.length > 0;

    if (isImageRequest) {
        if (userPlan !== 'pro') {
            const restrictionMsg = "image_generation_restricted";
            if (io && roomId) io.to(roomId).emit('pipeline_step', {
                step: 'restriction',
                content: "🎨 Image generation is a Pro feature. Please upgrade to unleash your full creativity!"
            });
            return {
                finalOutput: "🎨 **Image generation is a Pro feature.** Please upgrade to Pro to generate images with AI.",
                restricted: true
            };
        }
        console.log("🎨 Image Flow Detected: Switching agents to Visual Mode");
    }

    // --- AGENT 1: IDEA AGENT (Brainstorming) ---
    if (checkStop && checkStop()) throw new Error('STOPPED');
    console.log("💡 [1/4] Idea Agent Working...");

    const step1Msg = isImageRequest
        ? 'Idea Agent is visualizing 3 distinct image compositions...'
        : 'Idea Agent is brainstorming 3 creative concepts...';
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'idea_agent', content: step1Msg });

    // Dynamic Prompt based on Intent
    const ideaTask = isImageRequest
        ? `Task: The user wants an image. Generate 3 distinct, creative *visual concepts* or *art styles* for this image request. Describe the composition, lighting, and mood for each.`
        : `Task: Generate 3 distinct, creative and innovative concepts or ideas based on the user's request.`;

    const ideaPrompt = `Role: You are the "Idea Agent".
${ideaTask}
User Request: "${userPrompt}"
${historyContext ? `Context from previous conversation:\n${historyContext}` : ''}
Output: A list of 3 concepts with brief descriptions.`;

    const ideas = await runAgent(ideaPrompt, imageParts);
    console.log("✅ Ideas generated");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'ideas', content: ideas });

    await breathe();


    // --- AGENT 2: SELECTOR AGENT (Critique & Selection) ---
    if (checkStop && checkStop()) throw new Error('STOPPED');
    console.log("🧐 [2/4] Selector Agent Working...");
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'critic_agent', content: 'Selector Agent is reviewing the concepts...' });

    const selectorPrompt = `Role: You are the "Selector Agent".
Task: Analyze the provided ideas. Select the ONE best idea that most effectively addresses the user's request. Provide a brief critique and reasoning.
${isImageRequest ? 'Focus on which concept would result in the most visually striking and accurate image.' : ''}
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


    // --- AGENT 3: EXECUTOR AGENT (Refiner / Prompt Engineer) ---
    if (checkStop && checkStop()) throw new Error('STOPPED');
    console.log("🔧 [3/4] Executor Agent Working...");

    const step3Msg = isImageRequest
        ? 'Executor Agent is crafting the perfect image generation prompt...'
        : 'Executor Agent is generating the final content...';
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'refiner_agent', content: step3Msg });

    // Dynamic Prompt: If image, write a Prompt. If text, write Content.
    const executorTask = isImageRequest
        ? `Task: Act as an expert "Prompt Engineer". Take the Selected Idea and Improvements and write a **single, highly detailed image generation prompt**.
           - Describe subject, lighting, camera angle, art style, and texture in detail.
           - Output **ONLY** the raw prompt text. Do not add markdown or conversational filler like "Here is the prompt".`
        : `Task: Take the "Selected Idea" and the "Improvements" and generate the FINAL, COMPLETE output requested by the user.`;

    const executorPrompt = `Role: You are the "Executor Agent".
${executorTask}
User Request: "${userPrompt}"
Selected Idea & Critique:
${selectedConcept}
${historyContext ? `Context from previous conversation:\n${historyContext}` : ''}
Output: The refined final content.`;

    const finalContent = await runAgent(executorPrompt); // This is now either the Blog Post OR The Image Prompt
    console.log("✅ Final content/prompt generated");

    // Notify frontend (If it's an image, we show the prompt being used)
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'refined_ideas', content: finalContent });

    await breathe();


    // --- AGENT 4: FINAL AGENT (Presenter OR Image Generator) ---
    if (checkStop && checkStop()) throw new Error('STOPPED');
    console.log("🎤 [4/4] Final Agent Working...");

    let finalOutput;

    if (isImageRequest) {
        // --- IMAGE PATH ---
        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'presenter_agent', content: 'Sending refined prompt to Image Generator...' });

        // Use the output from Agent 3 (the prompt) to generate the image
        const imageUrl = await generateImageAgent(finalContent);

        finalOutput = `![Generated Image](${imageUrl})\n\n**Prompt Used:**\n> ${finalContent}`;
        console.log("✅ Image generated from pipeline");

    } else {
        // --- TEXT PATH ---
        if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'presenter_agent', content: 'Presenter Agent is compiling the final report...' });

        const presenterPrompt = `Role: You are the "Presenter Agent".
Task: Format the final content into a professional, well-structured layout using Markdown.
Final Content:
${finalContent}
Output: The final formatted response.`;

        finalOutput = await runAgent(presenterPrompt);
        console.log("✅ Text report generated");
    }

    // Final emission
    if (io && roomId) io.to(roomId).emit('pipeline_step', { step: 'final_output', content: finalOutput });

    return { ideas, selectedConcept, finalContent, finalOutput };
}

export default ideaPipeline;