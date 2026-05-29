import React from 'react';
import { 
  Grid3X3, 
  Bird, 
  Hexagon, 
  TrendingUp, 
  CircleDot, 
  Sparkles, 
  Keyboard, 
  Gamepad2, 
  Heart, 
  Trash2,
  ArrowRight
} from 'lucide-react';

// Icon mapper helper
export function GameIcon({ name, className = 'w-6 h-6' }) {
  switch (name) {
    case 'Grid3X3':
      return <Grid3X3 className={className} />;
    case 'Bird':
      return <Bird className={className} />;
    case 'Hexagon':
      return <Hexagon className={className} />;
    case 'TrendingUp':
      return <TrendingUp className={className} />;
    case 'CircleDot':
      return <CircleDot className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Keyboard':
      return <Keyboard className={className} />;
    default:
      return <Gamepad2 className={className} />;
  }
}

export function GameCard({ game, isFavorite, onSelect, onToggleFavorite, onDeleteCustom }) {
  const gradientColor = game.color || 'from-indigo-500 to-purple-600';
  
  return (
    <div 
      id={`game-card-${game.id}`}
      onClick={() => onSelect(game)}
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-800/60 border border-slate-700/50 backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:border-slate-500/50 hover:shadow-[0_10px_30px_rgba(0,0,0,0.30)] flex flex-col justify-between h-56"
    >
      {/* Dynamic Background Glow on Hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientColor} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 pointer-events-none`} />

      {/* Card Header & Badges */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-4">
          {/* Card Icon Circle */}
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradientColor} shadow-lg shadow-black/20 text-white transform group-hover:scale-110 transition-transform duration-300`}>
            <GameIcon name={game.icon} className="w-5 h-5" />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1.5 z-10">
            {/* Toggle Favorite Button */}
            <button
              id={`fav-btn-${game.id}`}
              onClick={(e) => onToggleFavorite(game, e)}
              className={`p-2 rounded-lg bg-slate-900/60 transition-colors border hover:bg-slate-900 ${
                isFavorite 
                  ? 'text-pink-500 border-pink-500/30 font-semibold' 
                  : 'text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Custom Game Trash/Delete Button if added by user */}
            {game.custom && onDeleteCustom && (
              <button
                id={`del-btn-${game.id}`}
                onClick={(e) => onDeleteCustom(game.id, e)}
                className="p-2 rounded-lg bg-slate-900/60 text-rose-500 border border-rose-500/30 hover:bg-rose-950/40 transition-colors"
                title="Delete custom game"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Title and Category Tag */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <h3 id={`game-title-${game.id}`} className="text-lg font-bold text-slate-100 tracking-tight group-hover:text-white line-clamp-1">
              {game.title}
            </h3>
            {game.custom && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                User
              </span>
            )}
          </div>
          <p id={`game-desc-${game.id}`} className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed flex-grow">
            {game.description}
          </p>
        </div>
      </div>

      {/* Card Footer Bar */}
      <div className="px-5 py-3.5 bg-slate-900/40 border-t border-slate-800/60 flex items-center justify-between text-xs">
        <span id={`game-category-${game.id}`} className="font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          {game.category}
        </span>

        <span className="flex items-center gap-1 font-medium text-slate-300 group-hover:text-white transition-colors">
          Play Now <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </div>
  );
}
