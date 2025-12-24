
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "YOUR_API_KEY";
const genAI = new GoogleGenerativeAI(apiKey);

const TRIP_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        trip_title: { type: SchemaType.STRING },
        destination: { type: SchemaType.STRING },
        itinerary: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } // Simplified for test
    }
};

async function run() {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        tools: [{ googleSearch: {} }],
        generationConfig: {
            // responseMimeType: "application/json",
            // responseSchema: TRIP_SCHEMA,
        }
    });

    const prompt = "Plan a trip to Japan. JSON format.";

    try {
        console.log("Testing JSON Mode + Search...");
        const result = await model.generateContent(prompt);
        console.log("Success!");
        let text = result.response.text();
        text = text.replace(/```json\n?|```/g, '').trim();
        console.log(JSON.parse(text));
    } catch (error) {
        console.error("Failed:", error.message);
    }
}

run();
