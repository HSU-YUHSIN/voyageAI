
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyCL35zP6nDwbsu9R0QGh1qAVa3nMORH-H0";
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        // This method is not directly exposed on the main class in some versions, 
        // but the error message suggested calling ListModels. 
        // We try to access it via the API client if possible or just try a different known model.
        // However, for this SDK version, we can try to fetch a model that definitely exists or handle the error.

        // Actually, let's try 'gemini-pro' specifically again in this isolated script to be sure.
        console.log("Testing gemini-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-pro");
        console.log(result.response.text());
    } catch (error) {
        console.error("Failed with gemini-pro:", error.message);
    }

    try {
        console.log("Testing gemini-1.5-flash-001...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-1.5-flash");
        console.log(result.response.text());
    } catch (error) {
        console.error("Failed with gemini-1.5-flash:", error.message);
    }

    try {
        console.log("Testing gemini-1.0-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-1.0-pro");
        console.log(result.response.text());
    } catch (error) {
        console.error("Failed with gemini-1.0-pro:", error.message);
    }
}

listModels();
