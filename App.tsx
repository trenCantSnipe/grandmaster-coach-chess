
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { 
  Trophy, 
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
import { Message } from './types';

const App: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [evalScore, setEvalScore] = useState(0);
  const [isIllegalMove, setIsIllegalMove] = useState(false);
  
  // Selection and Highlighting
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [optionSquares, setOptionSquares] = useState<any>({});
  const [lastMoveSquares, setLastMoveSquares] = useState<any>({});
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const updateLastMoveHighlight = (from: string, to: string) => {
    setLastMoveSquares({
      [from]: { background: 'rgba(255, 255, 0, 0.15)' },
      [to]: { background: 'rgba(255, 255, 0, 0.15)' },
    });
  };

  const getMoveOptions = useCallback((square: Square, currentGame: Chess) => {
    const moves = currentGame.moves({
      square,
      verbose: true,
    });
    
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: any = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          currentGame.get(move.to) && currentGame.get(move.to).color !== currentGame.get(square).color
            ? 'radial-gradient(circle, rgba(0,0,0,.2) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    });
    
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.35)',
    };
    
    setOptionSquares(newSquares);
    return true;
  }, []);

  // Optimized move logic to prevent piece snap-back
  function makeAMove(move: { from: string; to: string; promotion?: string }) {
    const gameCopy = new Chess(game.fen());
    try {
      const result = gameCopy.move(move);
      if (result) {
        setGame(gameCopy);
        setMoveFrom(null);
        setOptionSquares({});
        updateLastMoveHighlight(result.from, result.to);
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    if (game.turn() !== 'w' || isThinking || game.isGameOver()) return false;

    const moveResult = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });

    if (!moveResult) {
      setIsIllegalMove(true);
      setTimeout(() => setIsIllegalMove(false), 500);
      return false;
    }
    return true;
  };

  const onSquareClick = (square: Square) => {
    if (game.turn() !== 'w' || isThinking || game.isGameOver()) return;

    if (!moveFrom) {
      const hasOptions = getMoveOptions(square, game);
      if (hasOptions) setMoveFrom(square);
      return;
    }

    const moveResult = makeAMove({
      from: moveFrom,
      to: square,
      promotion: 'q',
    });

    if (!moveResult) {
      const hasOptions = getMoveOptions(square, game);
      if (hasOptions) {
        setMoveFrom(square);
      } else {
        setMoveFrom(null);
        setOptionSquares({});
      }
    }
  };

  const handleBotTurn = async () => {
    if (game.turn() !== 'b' || game.isGameOver()) return;
    
    setIsThinking(true);
    const history = game.history({ verbose: true });
    const lastUserMove = history[history.length - 1];
    
    // Quick flash commentary
    const comment = await getQuickCommentary(game.fen(), lastUserMove?.san || '');
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: comment,
      timestamp: Date.now()
    }]);

    // Deep Analysis
    const analysis = await getCoachAnalysis(game.fen(), game.history());
    if (analysis) {
      setEvalScore(analysis.eval);
      
      // Delay for realism
      setTimeout(() => {
        setGame((current) => {
          const update = new Chess(current.fen());
          try {
            const botResult = update.move(analysis.suggestedMove);
            if (botResult) {
              setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Engine Move: **${analysis.suggestedMove}**\n\n${analysis.analysis}\n\n*Coach Axiom: ${analysis.coachingTip}*`,
                timestamp: Date.now()
              }]);
              updateLastMoveHighlight(botResult.from, botResult.to);
            }
          } catch (e) {
            // Fallback for SAN parsing errors: just play a random move if analysis failed
            const moves = update.moves();
            if (moves.length > 0) {
              const fallback = update.move(moves[Math.floor(Math.random() * moves.length)]);
              if (fallback) updateLastMoveHighlight(fallback.from, fallback.to);
            }
          }
          return update;
        });
        setIsThinking(false);
      }, 1000);
    } else {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    if (game.turn() === 'b' && !game.isGameOver() && !isThinking) {
      const timer = setTimeout(handleBotTurn, 500); // Allow UI to update
      return () => clearTimeout(timer);
    }
  }, [game.fen()]);

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
      content: "Session initialized. I am your Grandmaster Coach. We shall navigate the complexities of this game-node graph together. Your move, White.",
      timestamp: Date.now()
    }]);
    setEvalScore(0);
    setMoveFrom(null);
    setOptionSquares({});
    setLastMoveSquares({});
  };

  useEffect(() => {
    if (messages.length === 0) resetGame();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row p-4 gap-6 max-w-[1600px] mx-auto overflow-hidden">
      {/* Game Section */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <header className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
              <BrainCircuit className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-tight tracking-tight uppercase">Grandmaster Chess</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Strategic State-Node Engine</p>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Evaluation</span>
              <span className={`text-xl font-mono font-black transition-colors duration-500 ${evalScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {evalScore > 0 ? `+${evalScore.toFixed(1)}` : evalScore.toFixed(1)}
              </span>
            </div>
            <button 
              onClick={resetGame}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 active:scale-90 shadow-lg"
            >
              <RotateCcw className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </header>

        <div 
          className={`relative chess-board-container rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.7)] bg-slate-900 border transition-all duration-300 aspect-square max-w-[700px] mx-auto w-full ${
            isIllegalMove ? 'border-red-500 ring-8 ring-red-500/10 scale-[0.99]' : 'border-slate-800'
          }`}
        >
           <Chessboard 
            position={game.fen()} 
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
            boardOrientation="white"
            customDarkSquareStyle={{ backgroundColor: '#1e293b' }}
            customLightSquareStyle={{ backgroundColor: '#334155' }}
            customSquareStyles={{
              ...lastMoveSquares,
              ...optionSquares
            }}
            animationDuration={300}
          />
          
          {isIllegalMove && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="bg-red-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border border-red-400/50 animate-bounce">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-black uppercase tracking-widest">Invalid Edge</span>
              </div>
            </div>
          )}

          {game.isGameOver() && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-30">
              <div className="bg-slate-900 p-12 rounded-[3rem] border border-indigo-500/30 text-center shadow-2xl">
                <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-8 drop-shadow-2xl" />
                <h2 className="text-5xl font-black text-white mb-3 uppercase italic tracking-tighter">Terminal State</h2>
                <p className="text-indigo-400 mb-10 font-bold text-xl uppercase tracking-widest">
                  {game.isCheckmate() ? (game.turn() === 'w' ? 'Black Victory' : 'White Victory') : 'Draw Reached'}
                </p>
                <button 
                  onClick={resetGame}
                  className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all shadow-indigo-500/40 uppercase tracking-widest"
                >
                  Reset Graph
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 flex-shrink-0">
          <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800 shadow-inner">
             <div className="flex items-center gap-2 mb-4 text-slate-600">
               <History className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">State Transitions</span>
             </div>
             <div className="flex flex-wrap gap-2.5 h-16 overflow-y-auto pr-2 custom-scrollbar">
                {game.history().map((m, i) => (
                  <span key={i} className="px-3 py-1.5 bg-slate-800/80 rounded-xl text-xs text-slate-300 font-mono border border-slate-700/50">
                    {Math.floor(i/2) + 1}{i%2===0 ? '.' : '...'} {m}
                  </span>
                ))}
                {game.history().length === 0 && <span className="text-slate-700 text-[10px] font-black uppercase tracking-[0.2em] italic">Graph Root State</span>}
             </div>
          </div>
          <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800 shadow-inner">
             <div className="flex items-center gap-2 mb-4 text-slate-600">
               <Zap className="w-4 h-4 text-amber-500" />
               <span className="text-[10px] font-black uppercase tracking-widest">Graph Logic</span>
             </div>
             <div className="text-[11px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight">
               Every legal move represents an edge weight calculation in the game-state graph. Bot uses deep traversal to select winning nodes.
             </div>
          </div>
        </div>
      </div>

      {/* Sidebar Section */}
      <div className="w-full md:w-[420px] lg:w-[480px] flex flex-col h-[calc(100vh-2rem)] sticky top-4 flex-shrink-0">
        <div className="flex-1 bg-slate-900 rounded-[2.5rem] border border-slate-800 flex flex-col overflow-hidden shadow-2xl relative">
          <div className="p-7 border-b border-slate-800 bg-slate-900/50 backdrop-blur-3xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner group transition-transform hover:scale-105">
                  <Sparkles className="w-7 h-7 text-indigo-400" />
                </div>
                {isThinking && (
                  <div className="absolute -top-1 -right-1 flex">
                    <span className="animate-ping absolute h-5 w-5 rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative rounded-full h-5 w-5 bg-emerald-500 border-2 border-slate-900"></span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-md font-black text-white uppercase tracking-tighter">Coach Magnus AI</h2>
                <div className="flex items-center gap-2 mt-1">
                   <div className={`w-2 h-2 rounded-full ${isThinking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                   <span className="text-[11px] text-slate-500 uppercase tracking-widest font-black">
                     {isThinking ? 'Analyzing Edges...' : 'Engine Online'}
                   </span>
                </div>
              </div>
            </div>
            <Settings className="w-6 h-6 text-slate-700 cursor-pointer hover:text-slate-300 transition-colors" />
          </div>

          <div className="flex-1 overflow-y-auto p-7 space-y-7 custom-scrollbar bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.04),transparent)]">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-3 duration-500`}>
                <div className={`max-w-[90%] rounded-[1.5rem] p-5 text-[13px] leading-relaxed shadow-xl border ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none border-indigo-400/30' 
                    : 'bg-slate-800 text-slate-200 border-slate-700/50 rounded-tl-none'
                }`}>
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-3' : ''}>
                      {line.startsWith('*') ? <em className="text-indigo-300 block border-l-4 border-indigo-500 pl-4 py-2 my-3 bg-indigo-500/10 font-bold italic rounded-r-xl">{line.replace(/\*/g, '')}</em> : line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-[1.5rem] p-5 rounded-tl-none border border-slate-700/50 shadow-2xl">
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-7 bg-slate-900/90 border-t border-slate-800 backdrop-blur-2xl">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for strategy advice..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 pl-6 pr-16 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all font-medium"
                disabled={isThinking}
              />
              <button 
                type="submit"
                disabled={isThinking || !input.trim()}
                className="absolute right-3 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-20 active:scale-90 shadow-2xl"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <div className="flex justify-between items-center mt-5 px-1 opacity-40">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">State Traverser X-1</span>
              <span className="text-[9px] text-indigo-500 font-black uppercase tracking-[0.2em]">Gemini 3 Pro</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;
