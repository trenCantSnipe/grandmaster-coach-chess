
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface GameState {
  fen: string;
  history: string[];
  turn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  winner: 'w' | 'b' | 'draw' | null;
}

export interface GraphNode {
  id: string;
  fen: string;
  move?: string;
  evaluation?: number;
  children: GraphNode[];
}
