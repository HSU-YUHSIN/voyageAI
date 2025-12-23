
import { GoogleGenerativeAI, SchemaType, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Using the key found in test_search.js
const apiKey = "AIzaSyCL35zP6nDwbsu9R0QGh1qAVa3nMORH-H0";
const genAI = new GoogleGenerativeAI(apiKey);

const userInput = "https://www.tourcenter.com.tw/travel/detail/print?NormGroupID=bd2c57df-197a-4ed6-b98f-e70a0c65a0a2&GroupID=26JT215BR9-K&PrintItem=ALL&utm_source=sidebar&utm_medium=copy";
const language = "English";

async function run() {
    // Mimicking the configuration from geminiService.ts
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        tools: [{ googleSearch: {} }],
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    });

    const prompt = `You are a high-accuracy Travel Product Designer and Tour Guide.
      TASK: Generate a trip plan in ${language}.
      INPUT: "${userInput}".
      
      STRICT ACCURACY RULES:
      1. If the input contains a URL, you MUST use the Google Search tool to find the official itinerary details (title, stops, inclusions) from that link. 
      2. Mirror the exact stops, times, and order listed in the provided link/image.
      3. If no link is provided, use grounding to find real, currently popular spots.
      4. For each stop, act as a tour guide: provide deep history and expert local tips.
      5. The final output must be in ${language}.
      6. IMPORTANT: You must output ONLY valid JSON. Do not include any conversational text, pleasantries, or apologies. If you cannot find the information, generate a best-guess itinerary based on the destination and keywords.`;

    try {
        console.log("Testing URL processing with model gemini-2.5-flash...");
        const result = await model.generateContent(prompt);
        console.log("Generation complete.");

        let text = result.response.text();
        // Clean markdown code blocks if present
        text = text.replace(/```json\n?|```/g, '').trim();

        console.log("--- Extracted JSON ---");
        // Try parsing to verify it is valid JSON
        try {
            const parsed = JSON.parse(text);
            console.log(JSON.stringify(parsed, null, 2));
            console.log("SUCCESS: Valid JSON generated.");
        } catch (e) {
            console.log("Raw output (Invalid JSON):", text);
            console.error("JSON Parse Error:", e.message);
        }

    } catch (error) {
        console.error("API Error:", error.message);
    }
}

run();
