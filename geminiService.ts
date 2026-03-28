import { GoogleGenAI, Type } from "@google/genai";
import axios from "axios";
import { SERVICES } from "../constants";
import { PlannerState, Vendor } from "../types";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
};

const serviceToYelpCategory: Record<string, string> = {
  venue: "venues",
  catering: "catering",
  photography: "photographers",
  music: "djs",
  decor: "florists,party_equipment_rentals",
  bar: "bartenders",
  invitations: "graphicdesign",
  videography: "videographers",
};

export const checkApiHealth = async () => {
  try {
    const response = await axios.get(`${getBaseUrl()}/api/health`);
    return response.data;
  } catch (error) {
    console.error("API health check failed:", error);
    return { status: "error", message: "Could not connect to backend" };
  }
};

export const testYelpConnection = async () => {
  try {
    const response = await axios.get(`${getBaseUrl()}/api/yelp/test`);
    return response.data;
  } catch (error: any) {
    console.error("Yelp connection test failed:", error);
    return {
      status: "error",
      message: error.message,
      details: error.response?.data,
    };
  }
};

export const generateEventAdvice = async (state: PlannerState) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

    const prompt = `Act as a world-class event planner. Create a curated checklist and expert advice for the following event:
    Event Type: ${state.eventType}
    Guests: ${state.guestCount}
    Vibe/Theme: ${state.vibe}
    Selected Services: ${state.selectedServices.join(", ")}

    Provide a JSON response with a custom checklist and theme suggestions.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            checklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A detailed checklist of 5-8 items for this specific event.",
            },
            suggestions: {
              type: Type.STRING,
              description: "Expert advice on themes, colors, and unique touches.",
            },
          },
          required: ["checklist", "suggestions"],
        },
      },
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini AI error (advice):", error);
    return {
      checklist: ["Book venue", "Finalize guest list", "Arrange catering", "Coordinate vendors"],
      suggestions: "Keep it elegant and focus on guest experience.",
    };
  }
};

export const searchVendors = async (
  state: PlannerState,
  specificService?: string,
): Promise<{ vendors: Vendor[]; error?: string }> => {
  try {
    const servicesToSearch = specificService ? [specificService] : state.selectedServices;

    const terms = servicesToSearch.map((id) => {
      const service = SERVICES.find((item) => item.id === id);
      return service?.searchQuery || service?.name || id;
    });

    const categories = servicesToSearch
      .map((id) => serviceToYelpCategory[id])
      .filter(Boolean)
      .join(",");

    const payload: Record<string, string | number> = {
      term: terms.join(", "),
      limit: 20,
    };

    if (categories) {
      payload.categories = categories;
    }

    if (state.location) {
      payload.latitude = state.location.lat;
      payload.longitude = state.location.lng;
    } else if (state.postalCode) {
      payload.location = state.postalCode;
    } else {
      payload.location = "New York, NY";
    }

    const endpoint = `${getBaseUrl()}/api/yelp/search`;
    const response = await axios.get(endpoint, {
      params: payload,
      headers: { Accept: "application/json" },
      timeout: 20000,
    });

    const data = response.data;

    if (!Array.isArray(data.businesses)) {
      return { vendors: [], error: "No vendors found in this area." };
    }

    const vendors = data.businesses.map((business: any) => ({
      id: business.id,
      name: business.name,
      type: business.categories?.map((category: any) => category.title).join(", ") || "Service",
      rating: business.rating,
      reviewCount: business.review_count,
      imageUrl: business.image_url,
      address: business.location
        ? [business.location.address1, business.location.city, business.location.state, business.location.zip_code]
            .filter(Boolean)
            .join(", ")
        : "No address listed",
      url: business.url,
      description: `Rating: ${business.rating || "N/A"} (${business.review_count || 0} reviews)${business.display_phone ? ` · ${business.display_phone}` : ""}`,
      lat: business.coordinates?.latitude,
      lng: business.coordinates?.longitude,
      source_url: business.url,
    }));

    return { vendors };
  } catch (error: any) {
    console.error("Vendor search error:", error);
    let errorMessage = error.message || "An unexpected error occurred";

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 500 && data?.error?.includes("YELP_API_KEY")) {
        errorMessage = "Yelp API key is missing on the server. Add YELP_API_KEY to your environment variables.";
      } else if (status === 401) {
        errorMessage = "Invalid Yelp API key. Verify YELP_API_KEY in your environment settings.";
      } else if (data?.error) {
        errorMessage = data.error;
      } else {
        errorMessage = `Server error (${status})`;
      }
    } else if (error.request) {
      errorMessage = "No response received from server. Check that the backend is running.";
    }

    return { vendors: [], error: errorMessage };
  }
};
