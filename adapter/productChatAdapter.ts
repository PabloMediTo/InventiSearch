import type { Message } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getResponse(text: string, _history: Message[]): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: text }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return "⚠️ Too many requests. Please wait a moment and try again.";
      }
      throw new Error(`Server responded with ${response.status}`);
    }

    const data = await response.json();
    return data.answer ?? data.response ?? JSON.stringify(data);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return "⚠️ Too many requests. Please wait a moment and try again.";
    }
    return `⚠️ An error occurred: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
