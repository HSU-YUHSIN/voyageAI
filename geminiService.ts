
import { GoogleGenerativeAI, SchemaType, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { TripPlan, Coordinates, GroundingSource } from "./types";

// Initialize the API with the key from Vite environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Schema definitions using the new SDK format (SchemaType enum or strings)
const TOUR_GUIDE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    history: { type: SchemaType.STRING },
    fun_facts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    best_time_to_visit: { type: SchemaType.STRING },
    local_tip: { type: SchemaType.STRING }
  },
  required: ["history", "fun_facts", "best_time_to_visit", "local_tip"]
};

// Main Trip Schema
const TRIP_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    trip_title: { type: SchemaType.STRING },
    destination: { type: SchemaType.STRING },
    map_center: {
      type: SchemaType.OBJECT,
      properties: {
        lat: { type: SchemaType.NUMBER },
        lng: { type: SchemaType.NUMBER }
      },
      required: ["lat", "lng"]
    },
    itinerary: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day: { type: SchemaType.NUMBER },
          date_description: { type: SchemaType.STRING },
          daily_summary: { type: SchemaType.STRING },
          activities: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                time: { type: SchemaType.STRING },
                place: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                coordinates: {
                  type: SchemaType.OBJECT,
                  properties: {
                    lat: { type: SchemaType.NUMBER },
                    lng: { type: SchemaType.NUMBER }
                  },
                  required: ["lat", "lng"]
                },
                icon: { type: SchemaType.STRING, description: "Lucide-react icon name" },
                tour_guide_info: TOUR_GUIDE_SCHEMA
              },
              required: ["time", "place", "description", "coordinates", "icon", "tour_guide_info"]
            }
          }
        },
        required: ["day", "date_description", "daily_summary", "activities"]
      }
    }
  },
  required: ["trip_title", "destination", "map_center", "itinerary"]
};

export const generateTripPlan = async (
  userInput: string,
  userLocation: Coordinates | null = null,
  language: string = "English",
  imageData?: { data: string, mimeType: string }
): Promise<TripPlan> => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      // @ts-ignore
      tools: [{ googleSearch: {} }],
      generationConfig: {
        // JSON Mode is incompatible with Tools in current Gemini API
        // responseMimeType: "application/json",
        // responseSchema: TRIP_SCHEMA,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const locationContext = userLocation
      ? `User location: lat ${userLocation.lat}, lng ${userLocation.lng}.`
      : "";

    const prompt = `You are a high-accuracy Travel Product Designer and Tour Guide.
      TASK: Generate a trip plan in ${language}.
      INPUT: "${userInput}".
      ${locationContext}
      
      STRICT ACCURACY RULES:
      1. If the input contains a URL, you MUST use the Google Search tool to find the official itinerary details (title, stops, inclusions) from that link. 
      2. Mirror the exact stops, times, and order listed in the provided link/image.
      3. If no link is provided, use grounding to find real, currently popular spots.
      4. For each stop, act as a tour guide: provide deep history and expert local tips.
      5. The final output must be in ${language}.
      6. IMPORTANT: You must output ONLY valid JSON. Do not include any conversational text, pleasantries, or apologies. If you cannot find the information, generate a best-guess itinerary based on the destination and keywords.`;

    const parts: any[] = [{ text: prompt }];

    if (imageData) {
      parts.push({
        inlineData: {
          data: imageData.data,
          mimeType: imageData.mimeType
        }
      });
    }

    const result = await model.generateContent(parts);
    console.log("Gemini Raw Result:", result); // Debug logging
    const response = result.response;
    let text = response.text();

    // Clean markdown code blocks if present
    text = text.replace(/```json\n?|```/g, '').trim();

    if (!text) throw new Error("No response from AI");
    try {
      const parsed = JSON.parse(text) as TripPlan;
      // Default empty logic for sources
      parsed.sources = [];
      return parsed;
    } catch (e) {
      console.error("JSON Parse Failed. Raw Text:", text);
      throw new Error("AI Refusal or Invalid JSON. The model might be refusing the request due to safety policies. Text: " + text.replace(/\n/g, ' '));
    }
  } catch (error) {
    console.error("Error generating trip plan:", error);
    throw error;
  }
};

export const updateTripPlan = async (
  currentPlan: TripPlan,
  adjustmentRequest: string,
  language: string = "English",
  imageData?: { data: string, mimeType: string }
): Promise<TripPlan> => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      // @ts-ignore
      tools: [{ googleSearch: {} }],
      generationConfig: {
        // JSON Mode is incompatible with Tools in current Gemini API
        // responseMimeType: "application/json",
        // responseSchema: TRIP_SCHEMA,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const prompt = `Modify this itinerary while keeping it grounded in real-world facts. 
      Current Plan: ${JSON.stringify(currentPlan)}. 
      User Request: "${adjustmentRequest}". 
      Language: ${language}.
      IMPORTANT: Output ONLY valid JSON. No conversational text.`;

    const parts: any[] = [{ text: prompt }];

    if (imageData) {
      parts.push({
        inlineData: {
          data: imageData.data,
          mimeType: imageData.mimeType
        }
      });
    }

    const result = await model.generateContent(parts);
    const response = result.response;
    let text = response.text();
    text = text.replace(/```json\n?|```/g, '').trim();

    if (!text) throw new Error("No response from AI");

    try {
      return JSON.parse(text) as TripPlan;
    } catch (e) {
      console.error("Update JSON Parse Failed. Raw Text:", text);
      throw new Error("AI Refusal: " + text.replace(/\n/g, ' '));
    }
  } catch (error) {
    console.error("Error updating trip plan:", error);
    throw error;
  }
};

export const translateTripPlan = async (
  currentPlan: TripPlan,
  targetLanguage: string
): Promise<TripPlan> => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // 2.5 Flash is good for JSON translation
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: TRIP_SCHEMA,
      }
    });

    const prompt = `Translate this travel plan into ${targetLanguage}. 
      Maintain exact same coordinates and icon strings.
      JSON: ${JSON.stringify(currentPlan)}.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) throw new Error("Translation failed");
    return JSON.parse(text) as TripPlan;
  } catch (error) {
    console.error("Error translating trip plan:", error);
    throw error;
  }
};

export const generatePlaceImage = async (placeName: string, destination: string): Promise<string> => {
  try {
    // Note: generatePlaceImage logic for images isn't fully standard in Gemini 1.5 Flash (it's text/multimodal in, text out).
    // The previous code used gemini-2.5-flash-image which might be specific.
    // For now, we will return empty string or mock, as standard library doesn't support image generation directly via generateContent (requires Imagen).
    // If the goal is just an image URL, we might need a different API.
    // However, to prevent crashing, we'll try a safe fallback or just catch error.
    /*
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Not for images
    */
    return "";
  } catch (error: any) {
    console.error("Image generation skipped:", error.message || error);
    return "";
  }
};
