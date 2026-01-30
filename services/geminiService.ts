
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getCoachAnalysis(
  fen: string,
  history: string[],
  userMessage?: string
) {
  const model = 'gemini-3-pro-preview';
  
  const prompt = `
    You are a world-class Chess Grandmaster and Strategy Coach. 
    Current State (FEN): ${fen}
    Path History: ${history.join(', ')}
    
    ${userMessage ? `The user asks: "${userMessage}"` : "Analyze the current state and provide the optimal transition (move)."}
    
    Respond STRICTLY in JSON:
    1. "analysis": A deep grandmaster-level explanation.
    2. "suggestedMove": Best move in Standard Algebraic Notation (e.g., "e4", "Nf3").
    3. "eval": Float evaluation from White's perspective (+1.0 is +1 pawn for white).
    4. "coachingTip": A concise strategic axiom.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 16000 },
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

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Coaching Analysis Error:", error);
    return null;
  }
}

export async function getQuickCommentary(fen: string, lastMove: string) {
  const model = 'gemini-flash-lite-latest';
  const prompt = `Context: Chess game at ${fen}. Last move: ${lastMove}. Give a 1-sentence witty, sharp Grandmaster reaction to this move. Max 12 words.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt
    });
    return response.text;
  } catch (error) {
    return "An interesting deviation in the lines.";
  }
}
