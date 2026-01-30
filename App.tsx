
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { 
  Trophy, 
  MessageSquare, 
  History, 
  Settings, 
  BrainCircuit, 
  ChevronRight,
  RotateCcw,
  Sparkles,
  Zap,
  AlertCircle
} from 'lucide-react';
import { getCoachAnalysis, getQuickCommentary } from './services/geminiService';
import { Message, GameState } from './types';

const App: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [evalScore, setEvalScore] = useState(0);
  const [isIllegalMove, setIsIllegalMove] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const makeMove = useCallback((move: any) => {
    try {
      const result = game.move(move);
      if (result) {
        setGame(new Chess(game.fen()));
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }, [game]);

  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    // Only allow moves if it's White's turn (the user) and no bot is thinking
    if (game.turn() !== 'w' || isThinking || game.isGameOver()) {
      triggerIllegalMoveFeedback();
      return false;
    }

    const moveResult = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });

    if (moveResult) {
      handleBotTurn();
      return true;
    } else {
      triggerIllegalMoveFeedback();
      return false;
    }
  };

  const triggerIllegalMoveFeedback = () => {
    setIsIllegalMove(true);
    setTimeout(() => setIsIllegalMove(false), 600);
  };

  const handleBotTurn = async () => {
    setIsThinking(true);
    const history = game.history();
    const lastMove = history[history.length - 1];
    
    // Quick commentary for immediate feedback
    const comment = await getQuickCommentary(game.fen(), lastMove);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: comment,
      timestamp: Date.now()
    }]);

    // Deep analysis and move suggestion
    const analysis = await getCoachAnalysis(game.fen(), history);
    if (analysis) {
      setEvalScore(analysis.eval);
      
      // The coach plays the black side.
      if (game.turn() === 'b' && !game.isGameOver()) {
        setTimeout(() => {
          const moveMade = makeMove(analysis.suggestedMove);
          if (moveMade) {
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `I've played **${analysis.suggestedMove}**. ${analysis.analysis}\n\n*Coach Tip: ${analysis.coachingTip}*`,
              timestamp: Date.now()
            }]);
          }
          setIsThinking(false);
        }, 600);
      } else {
        setIsThinking(false);
      }
    } else {
      setIsThinking(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    const response = await getCoachAnalysis(game.fen(), game.history(), input);
    if (response) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.analysis,
        timestamp: Date.now()
      }]);
    }
    setIsThinking(false);
  };

  const resetGame = () => {
    setGame(new Chess());
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Welcome, student. I am your Grandmaster Coach. Let's start a fresh game. You have the white pieces. Good luck!",
      timestamp: Date.now()
    }]);
    setEvalScore(0);
    setIsIllegalMove(false);
  };

  useEffect(() => {
    if (messages.length === 0) {
      resetGame();
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row p-4 gap-6 max-w-[1600px] mx-auto">
      {/* Left Column: Board & Stats */}
      <div className="flex-1 flex flex-col gap-6">
        <header className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BrainCircuit className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Grandmaster AI</h1>
              <p className="text-xs text-slate-400">Powered by Gemini 3 Pro</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Evaluation</span>
              <span className={`text-lg font-mono font-bold ${evalScore >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {evalScore > 0 ? `+${evalScore.toFixed(1)}` : evalScore.toFixed(1)}
              </span>
            </div>
            <button 
              onClick={resetGame}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
              title="Reset Game"
            >
              <RotateCcw className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </header>

        <div 
          className={`relative chess-board-container rounded-xl overflow-hidden shadow-2xl bg-slate-900 border transition-all duration-300 aspect-square max-w-[700px] mx-auto w-full ${
            isIllegalMove ? 'border-red-500 ring-4 ring-red-500/20 scale-[0.99]' : 'border-slate-800'
          }`}
        >
           <Chessboard 
            position={game.fen()} 
            onPieceDrop={onDrop}
            boardOrientation="white"
            customDarkSquareStyle={{ backgroundColor: '#1e293b' }}
            customLightSquareStyle={{ backgroundColor: '#334155' }}
            animationDuration={300}
          />
          
          {/* Illegal Move Feedback Overlay (Subtle) */}
          {isIllegalMove && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="bg-red-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-md border border-red-400/50 animate-bounce">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Illegal Move</span>
              </div>
            </div>
          )}

          {game.isGameOver() && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="bg-slate-900 p-8 rounded-3xl border border-indigo-500 text-center shadow-2xl transform scale-110">
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-3xl font-black text-white mb-2">Game Over</h2>
                <p className="text-indigo-300 mb-6 font-medium">
                  {game.isCheckmate() ? (game.turn() === 'w' ? 'Black Wins!' : 'White Wins!') : 'Draw!'}
                </p>
                <button 
                  onClick={resetGame}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
             <div className="flex items-center gap-2 mb-3 text-slate-400">
               <History className="w-4 h-4" />
               <span className="text-xs font-bold uppercase tracking-widest">Move History</span>
             </div>
             <div className="flex flex-wrap gap-2 h-20 overflow-y-auto pr-2">
                {game.history().map((m, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-800 rounded text-sm text-slate-300 font-mono">
                    {Math.floor(i/2) + 1}{i%2===0 ? '.' : '...'} {m}
                  </span>
                ))}
             </div>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
             <div className="flex items-center gap-2 mb-3 text-slate-400">
               <Zap className="w-4 h-4 text-yellow-500" />
               <span className="text-xs font-bold uppercase tracking-widest">Graph Reasoning</span>
             </div>
             <div className="text-xs text-slate-400 leading-relaxed">
               The engine validates moves by checking them against the legal edges of the current position node in the game-graph. Only connected states are reachable.
             </div>
          </div>
        </div>
      </div>

      {/* Right Column: Chat & Analysis */}
      <div className="w-full md:w-[450px] flex flex-col h-[calc(100vh-2rem)] sticky top-4">
        <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/30">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
                {isThinking && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-9