import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Key length:", key ? key.length : 0);
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
        console.log("API Error:", data.error.message);
        return;
    }
    const imagenModels = data.models ? data.models.filter(m => m.name.includes('imagen')).map(m => m.name) : data;
    console.log("Available Imagen Models:", imagenModels);
}
test();
