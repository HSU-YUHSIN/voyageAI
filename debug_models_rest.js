
const apiKey = process.env.GEMINI_API_KEY || "YOUR_API_KEY";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function run() {
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", JSON.stringify(data.error, null, 2));
        } else {
            console.log("Available Models:");
            if (data.models) {
                // Filter to only show gemini models to keep it clean
                data.models
                    .filter(m => m.name.includes("gemini"))
                    .forEach(m => console.log(`- ${m.name}`));
            } else {
                console.log(JSON.stringify(data, null, 2));
            }
        }
    } catch (e) {
        console.error("Network Error:", e);
    }
}

run();
