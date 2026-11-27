# ♟️ Grandmaster Coach

A chess app with an AI coach that explains your moves. It doesn't just play against you: it stops to point out mistakes, explains the positional idea behind a better move, and comments on the game as it goes.

## Features

- **Playable board** with full rule enforcement via `chess.js` (legal moves, check, mate, draws)
- **Coach analysis**: Gemini returns a structured evaluation of the position (JSON schema output), with reasoning ("thinking") turned on for deeper lines
- **Live commentary**: short quick-take comments after each move
- **Correct-as-you-play**: flags inaccuracies and suggests stronger alternatives

## Tech stack

React 19 · TypeScript · Vite · chess.js · react-chessboard · Google Gemini API (`@google/genai`)

## How it works

```
board move ──► chess.js (validate, FEN) ──► geminiService.getCoachAnalysis(FEN, history)
                                              └─► structured JSON: evaluation, best move, explanation
```

## Run locally

```bash
git clone https://github.com/trenCantSnipe/grandmaster-coach-chess.git && cd grandmaster-coach-chess
npm install
echo "GEMINI_API_KEY=your_key_here" > .env.local
npm run dev
```

Get a free key at [Google AI Studio](https://aistudio.google.com/apikey). The key stays in `.env.local`, which is git-ignored.
