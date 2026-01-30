
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getCoachAnalysis(
  fen: string,
  history: string[],
  userMessage?: string
) {
  const model = 'gemini-3-pro-preview';
  
  const prompt = `
    You are a world-class Chess Grandmaster and Coach. 
    Current FEN: ${fen}
    Move History: ${history.join(', ')}
    
    ${userMessage ? `The player says: "${userMessage}"` : "Analyze the current position and suggest the best move."}
    
    Provide your response in JSON format including:
    1. "analysis": A deep strategic explanation of the current position.
    2. "suggestedMove": The best move in algebraic notation (e.g., "Nf3").
    3. "eval": A numerical evaluation (positive for white, negative for black).
    4. "coachingTip": A piece of general chess wisdom relevant to this specific position.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            suggestedMove: { type: Type.STRING },
            eval: { type: Type.NUMBER },
            coachingTip: { type: Type.STRING }
          },
          required: ["analysis", "suggestedMove", "eval", "coachingTip"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Coaching Error:", error);
    return null;
  }
}

export async function getQuickCommentary(fen: string, lastMove: string) {
  const model = 'gemini-2.5-flash-lite-latest';
  const prompt = `Give a very short, witty grandmaster commentary on the move ${lastMove} in this position: ${fen}. Max 15 words.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt
    });
    return response.text;
  } catch (error) {
    return "Interesting choice.";
  }
}
