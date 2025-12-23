
import { GoogleGenAI, Type } from "@google/genai";
import { TripPlan, Coordinates, GroundingSource } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const TOUR_GUIDE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    history: { type: Type.STRING },
    fun_facts: { type: Type.ARRAY, items: { type: Type.STRING } },
    best_time_to_visit: { type: Type.STRING },
    local_tip: { type: Type.STRING }
  },
  required: ["history", "fun_facts", "best_time_to_visit", "local_tip"]
};

const TRIP_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    trip_title: { type: Type.STRING },
    destination: { type: Type.STRING },
    map_center: {
      type: Type.OBJECT,
      properties: {
        lat: { type: Type.NUMBER },
        lng: { type: Type.NUMBER }
      },
      required: ["lat", "lng"]
    },
    itinerary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.NUMBER },
          date_description: { type: Type.STRING },
          daily_summary: { type: Type.STRING },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                place: { type: Type.STRING },
                description: { type: Type.STRING },
                coordinates: {
                  type: Type.OBJECT,
                  properties: {
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER }
                  },
                  required: ["lat", "lng"]
                },
                icon: { type: Type.STRING, description: "Lucide-react icon name" },
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
    const locationContext = userLocation 
      ? `User location: lat ${userLocation.lat}, lng ${userLocation.lng}.` 
      : "";

    const parts: any[] = [
      {
        text: `You are a high-accuracy Travel Product Designer and Tour Guide.
        TASK: Generate a trip plan in ${language}.
        INPUT: "${userInput}".
        ${locationContext}
        
        STRICT ACCURACY RULES:
        1. If the input contains a URL, you MUST use the 'googleSearch' tool to fetch the EXACT itinerary from that link. 
        2. DO NOT create a generic trip. Mirror the exact stops, times, and order listed in the provided link/image.
        3. If no link is provided, use grounding to find real, currently popular spots.
        4. For each stop, act as a tour guide: provide deep history and expert local tips.
        5. The final output must be in ${language}.`
      }
    ];

    if (imageData) {
      parts.push({
        inlineData: {
          data: imageData.data,
          mimeType: imageData.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: TRIP_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const parsed = JSON.parse(text) as TripPlan;
    
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) sources.push({ title: chunk.web.title || "Official Data", uri: chunk.web.uri });
      });
    }
    parsed.sources = Array.from(new Set(sources.map(s => s.uri))).map(uri => sources.find(s => s.uri === uri)!);
    
    return parsed;
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
    const parts: any[] = [
      {
        text: `Modify this itinerary while keeping it grounded in real-world facts. 
        Current Plan: ${JSON.stringify(currentPlan)}. 
        User Request: "${adjustmentRequest}". 
        Language: ${language}.`
      }
    ];

    if (imageData) {
      parts.push({
        inlineData: {
          data: imageData.data,
          mimeType: imageData.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: TRIP_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as TripPlan;
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate this travel plan into ${targetLanguage}. 
      Maintain exact same coordinates and icon strings.
      JSON: ${JSON.stringify(currentPlan)}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: TRIP_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Translation failed");
    return JSON.parse(text) as TripPlan;
  } catch (error) {
    console.error("Error translating trip plan:", error);
    throw error;
  }
};

export const generatePlaceImage = async (placeName: string, destination: string): Promise<string> => {
  try {
    // Simplified prompt to avoid potential backend validation/safety filter triggers that cause 500s
    const prompt = `A beautiful, clear travel photo of ${placeName} in ${destination}. High resolution, wide angle, cinematic.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: { aspectRatio: "16:9" }
      },
    });
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return "";
  } catch (error: any) {
    // If we hit a 500 xhr error, log it specifically but don't crash the app
    console.error("Image generation failed:", error.message || error);
    return "";
  }
};
