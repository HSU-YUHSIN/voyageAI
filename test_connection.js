
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyCL35zP6nDwbsu9R0QGh1qAVa3nMORH-H0";
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = "Explain how AI works";

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log(text);
    } catch (error) {
        console.error(error);
    }
}

run();
