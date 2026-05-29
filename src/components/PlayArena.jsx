import React, { useState, useRef, useEffect } from 'react';
import { GameIcon } from './GameCard';
import { 
  ArrowLeft,
  Heart, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Keyboard, 
  Info, 
  User, 
  AlertTriangle,
  Play,
  Smartphone
} from 'lucide-react';

export function PlayArena({ game, isFavorite, onToggleFavorite, onBack }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0); // For reloading the iframe
  const iframeContainerRef = useRef(null);
  
  const gradientColor = game.color || 'from-indigo-500 to-purple-600';

  // Listen to fullscreen changes outside standard triggers
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle Fullscreen API trigger
  const handleToggleFullscreen = async () => {
    if (!iframeContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await iframeContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Failed to toggle fullscreen:', err);
    }
  };

  // Handle iframe reloader
  const handleReload = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  return (
    <div id="play-arena-container" className="flex flex-col gap-6 animate-fade-in">
      
      {/* Play Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
        
        <div className="flex items-center gap-4">
          <button
            id="back-to-catalog-btn"
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700/80 hover:bg-slate-750 hover:text-white rounded-xl transition-all hover:translate-x-[-2px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Arcade
          </button>
          
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${gradientColor} text-white shadow-md`}>
              <GameIcon name={game.icon} className="w-5 h-5" />
            </div>
            <div>
              <h2 id="active-game-title" className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-sans">
                {game.title}
                {game.custom && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Custom Setup
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-medium tracking-wide font-mono uppercase mt-0.5">
                {game.category}
              </p>
            </div>
          </div>
        </div>

        {/* Console Action Bar */}
        <div className="flex items-center gap-2.5">
          {/* Favorite Toggle */}
          <button
            id="arena-favorite-btn"
            onClick={() => onToggleFavorite(game)}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border transition-all ${
              isFavorite 
                ? 'text-pink-500 bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20' 
                : 'text-slate-300 bg-slate-800 border-slate-700 hover:bg-slate-750 hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            <span className="hidden md:inline">{isFavorite ? 'Favorited' : 'Add Favorite'}</span>
          </button>

          {/* Refresh Frame */}
          <button
            id="arena-reload-btn"
            onClick={handleReload}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-750 hover:text-white rounded-xl transition-all"
            title="Reload Game Frame"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden md:inline">Restart</span>
          </button>

          {/* Toggle Theater Width */}
          <button
            id="arena-theater-btn"
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border transition-all ${
              isTheaterMode 
                ? 'text-cyan-400 bg-cyan-950/20 border-cyan-500/30 hover:bg-cyan-950/30' 
                : 'text-slate-300 bg-slate-800 border-slate-700 hover:bg-slate-750 hover:text-white'
            }`}
            title="Toggle Theater Mode (Wider Viewport)"
          >
            {isTheaterMode ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span className="hidden md:inline">Normal View</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span className="hidden md:inline">Theater Grid</span>
              </>
            )}
          </button>

          {/* Fullscreen Game Play Mode */}
          <button
            id="arena-fullscreen-btn"
            onClick={handleToggleFullscreen}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-750 hover:text-white rounded-xl transition-all"
            title="Enter Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden md:inline">Fullscreen</span>
          </button>
        </div>

      </div>

      {/* Main Game Screen & Content Info Area */}
      <div className={`grid grid-cols-1 ${isTheaterMode ? 'lg:grid-cols-1 max-w-full' : 'lg:grid-cols-3 max-w-6xl'} gap-6 mx-auto w-full transition-all duration-300`}>
        
        {/* Iframe Viewport Container (Take 2 columns in normal mode, full in theater) */}
        <div className={`lg:col-span-2 flex flex-col gap-4 ${isTheaterMode ? 'w-full lg:col-span-1 border-b border-slate-800 pb-4' : ''}`}>
          
          <div 
            id="iframe-player-wrapper"
            ref={iframeContainerRef}
            className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-slate-950 rounded-2xl border-2 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Loading Cover Spinner with Neon tag */}
            {isLoading && (
              <div id="game-loading-overlay" className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center z-20 p-6 text-center">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradientColor} mb-5 shadow-lg animate-bounce`}>
                  <GameIcon name={game.icon} className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-lg font-bold text-white tracking-tight font-sans">
                  Booting {game.title}...
                </h3>
                
                <p className="text-xs text-slate-400 mt-2 max-w-xs font-mono font-light">
                  Preparing secure unblocked connection to host asset servers
                </p>

                {/* Spinning bar */}
                <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-6 overflow-hidden">
                  <div className={`w-full h-full bg-gradient-to-r ${gradientColor} origin-left animate-[pulseGlow_1.5s_infinite_ease-in-out]`} />
                </div>
              </div>
            )}

            {/* Simulated Frame Actions for Fullscreen Escapers */}
            {isFullscreen && (
              <button
                id="exit-fullscreen-overlay-btn"
                onClick={handleToggleFullscreen}
                className="absolute top-4 right-4 z-30 p-2.5 rounded-lg bg-slate-900/80 text-white hover:bg-slate-900 border border-slate-700 backdrop-blur-md opacity-40 hover:opacity-100 transition-opacity"
                title="Exit Fullscreen"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            )}

            {/* The Game Iframe */}
            <iframe
              id="game-iframe-element"
              key={`${game.id}-${iframeKey}`}
              src={game.iframeUrl}
              title={`Play ${game.title} Unblocked`}
              className="w-full h-full border-0 absolute inset-0"
              allow="autoplay; fullscreen; gamepad; focus; keyboard"
              onLoad={() => setIsLoading(false)}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Quick Notice about Iframe Controls */}
          <div className="flex items-center gap-3 bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-3 text-xs text-indigo-300">
            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            <p className="font-sans">
              <strong>Pro-tip:</strong> If game controls (like Arrow Keys or Space) don't respond, simply click inside the game window above to focus the screen.
            </p>
          </div>

        </div>

        {/* Sidebar Info & Guides (Take 1 column in normal, horizontal grid in theater) */}
        <div className={`flex flex-col gap-5 ${isTheaterMode ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : ''}`}>
          
          {/* Instructions Block */}
          <div id="game-instructions-panel" className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-sm flex flex-col gap-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-3 font-sans">
              <Keyboard className="w-4 h-4 text-cyan-400" />
              How To Play
            </h3>
            
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              {game.instructions || 'Use standard game controls inside the screen frame. Most classic HTML5 arcade apps use keyboard arrow keys or mouse coordinates.'}
            </p>

            <div className="flex flex-col gap-2 mt-2 font-sans">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider">Useful Keyboard Keys</span>
              <div className="flex flex-wrap gap-1.5">
                <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-300 shadow">WASD / Arrows</kbd>
                <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-300 shadow">Space</kbd>
                <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-300 shadow">Enter</kbd>
                <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-300 shadow">Esc</kbd>
              </div>
            </div>
          </div>

          {/* Metadata, Author and Safety Disclaimer Block */}
          <div id="game-metadata-panel" className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-sm flex flex-col gap-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-3 font-sans">
              <Info className="w-4 h-4 text-sky-400" />
              Game Profile Info
            </h3>

            <div className="space-y-3 text-sm font-sans">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Published Category</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-905 text-slate-300 border border-slate-700 font-semibold">
                  {game.category}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Credits
                </span>
                <span className="text-slate-200 font-medium">{game.credits || 'Unknown Dev'}</span>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-slate-700/50 pt-3 mt-1 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <p>
                  This unblocked version is configured for client-only sandbox mode. It does not carry account logins or save records directly outside your browser local storage.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
