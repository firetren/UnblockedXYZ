import React, { useState, useEffect } from 'react';
import originalGamesData from './games.json';
import { GameCard } from './components/GameCard.jsx';
import { PlayArena } from './components/PlayArena.jsx';
import { AddGameForm } from './components/AddGameForm.jsx';
import { 
  Gamepad2, 
  Search, 
  Sparkles, 
  Plus, 
  HelpCircle,
  Heart,
  Flame,
  Grid,
  TrendingUp,
  Clock,
  Minimize,
  EyeOff
} from 'lucide-react';

const STATIC_GAMES = originalGamesData;

export default function App() {
  // State Storage
  const [games, setGames] = useState(STATIC_GAMES);
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [favorites, setFavorites] = useState([]);
  const [recentPlays, setRecentPlays] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load custom data on Mount
  useEffect(() => {
    // 1. Fetch custom items
    const savedCustom = localStorage.getItem('unblocked_custom_games');
    if (savedCustom) {
      try {
        const parsedCustom = JSON.parse(savedCustom);
        setGames([...STATIC_GAMES, ...parsedCustom]);
      } catch (err) {
        console.error('Error parsing custom games list:', err);
      }
    }

    // 2. Fetch favorites
    const savedFavs = localStorage.getItem('unblocked_favorites');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (err) {
        console.error('Error parsing favorites list:', err);
      }
    }

    // 3. Fetch recent plays
    const savedRecent = localStorage.getItem('unblocked_recent_plays');
    if (savedRecent) {
      try {
        setRecentPlays(JSON.parse(savedRecent));
      } catch (err) {
        console.error('Error parsing recent plays list:', err);
      }
    }
  }, []);

  // Write favorites modifications
  const handleToggleFavorite = (game, e) => {
    if (e) e.stopPropagation();
    
    let updated;
    if (favorites.includes(game.id)) {
      updated = favorites.filter(id => id !== game.id);
    } else {
      updated = [...favorites, game.id];
    }
    setFavorites(updated);
    localStorage.setItem('unblocked_favorites', JSON.stringify(updated));
  };

  // Write custom games additions
  const handleAddCustomGame = (newGame) => {
    const savedCustom = localStorage.getItem('unblocked_custom_games');
    let customList = [];
    if (savedCustom) {
      try {
        customList = JSON.parse(savedCustom);
      } catch (e) {
        customList = [];
      }
    }
    customList.push(newGame);
    localStorage.setItem('unblocked_custom_games', JSON.stringify(customList));
    setGames([...STATIC_GAMES, ...customList]);
  };

  // Delete custom game handler
  const handleDeleteCustomGame = (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this custom game from your catalog?')) {
      return;
    }

    const savedCustom = localStorage.getItem('unblocked_custom_games');
    let customList = [];
    if (savedCustom) {
      try {
        customList = JSON.parse(savedCustom);
      } catch (err) {
        customList = [];
      }
    }
    const filtered = customList.filter(g => g.id !== id);
    localStorage.setItem('unblocked_custom_games', JSON.stringify(filtered));
    setGames([...STATIC_GAMES, ...filtered]);
    
    // If active game is being deleted, go back
    if (selectedGame && selectedGame.id === id) {
      setSelectedGame(null);
    }
    
    // Remove from recent plays and favorites
    const updatedFavs = favorites.filter(fId => fId !== id);
    setFavorites(updatedFavs);
    localStorage.setItem('unblocked_favorites', JSON.stringify(updatedFavs));

    const updatedRecent = recentPlays.filter(rId => rId !== id);
    setRecentPlays(updatedRecent);
    localStorage.setItem('unblocked_recent_plays', JSON.stringify(updatedRecent));
  };

  // Handle Select Game to start playing
  const handleSelectGame = (game) => {
    setSelectedGame(game);
    
    // Track Recent plays (Keep max 5 unique entries)
    const updatedRecent = [game.id, ...recentPlays.filter(id => id !== game.id)].slice(0, 5);
    setRecentPlays(updatedRecent);
    localStorage.setItem('unblocked_recent_plays', JSON.stringify(updatedRecent));

    // Scroll smoothly to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter Catalog
  const filteredGames = games.filter(game => {
    // 1. Search Query filter (matches title, description, or author credits)
    const matchesSearch = 
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (game.credits && game.credits.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // 2. Category filter
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Favorites') return favorites.includes(game.id);
    if (selectedCategory === 'Custom') return game.custom === true;
    
    return game.category === selectedCategory;
  });

  // Fetch concrete items for Recents
  const recentGames = recentPlays
    .map(id => games.find(g => g.id === id))
    .filter(g => !!g);

  return (
    <div id="unblocked-games-app-root" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 flex flex-col justify-between">
      
      {/* Top Navigation Bar Inspired by the Bento Theme */}
      <header className="h-20 border-b border-slate-850 flex items-center justify-between px-4 sm:px-8 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div 
          id="brand-header-logo-group"
          onClick={() => setSelectedGame(null)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-xl tracking-tighter shadow-lg shadow-indigo-500/30 transform group-hover:scale-105 transition-transform">
            👾
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              GLITCH.IO
            </h1>
            <p className="text-[9px] font-mono tracking-widest text-indigo-400 uppercase">
              Sandbox Games
            </p>
          </div>
        </div>

        {/* Live Search Engine in Header (replaces generic centered bar from theme) */}
        {!selectedGame && (
          <div className="hidden md:flex flex-1 max-w-sm lg:max-w-md mx-6 lg:mx-12">
            <div className="relative flex items-center w-full">
              <Search className="absolute left-4 text-slate-500 w-4 h-4" />
              <input 
                id="header-search-bar"
                type="text" 
                placeholder="Search catalog, authors, categories..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/40 border border-slate-750 rounded-full py-2 pl-11 pr-6 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-500 text-xs transition-colors"
              />
            </div>
          </div>
        )}

        {/* Global Control Button */}
        <div className="flex items-center gap-3">
          <button
            id="cta-add-custom-game-nav"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold font-mono tracking-wider uppercase bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all shadow-md shadow-indigo-900/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Game
          </button>
        </div>
      </header>

      {/* Main Bento Frame Component */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-8">
        
        {selectedGame ? (
          // Active Gameplay Arena Mode
          <PlayArena 
            game={selectedGame}
            isFavorite={favorites.includes(selectedGame.id)}
            onToggleFavorite={() => handleToggleFavorite(selectedGame)}
            onBack={() => setSelectedGame(null)}
          />
        ) : (
          // Homescreen browser showcasing Bento modular grid sections
          <div id="homescreen-browser-layout" className="flex flex-col gap-8">

            {/* Mobile Search - Visible only on smaller display ports */}
            <div className="relative flex items-center w-full md:hidden">
              <Search className="absolute left-4 text-slate-500 w-4 h-4" />
              <input 
                id="header-search-bar-mobile"
                type="text" 
                placeholder="Search catalog, authors, categories..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-full py-2.5 pl-11 pr-6 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-500 text-xs transition-colors"
              />
            </div>

            {/* Main Aesthetic Bento Mosaic */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Bento 1: Dynamic Featured Game (Large Bento, spans 2x2 on lg grid) */}
              {games.length > 0 && (
                (() => {
                  const featuredGame = games.find(g => g.id === 'html5-snake') || games[0];
                  return (
                    <div className="col-span-1 md:col-span-2 lg:row-span-2 bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden relative group p-6 sm:p-8 flex flex-col justify-between h-[360px] sm:h-[400px] hover:border-slate-700/60 transition-colors">
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10" />
                      <div className="absolute inset-0 bg-indigo-500/[0.04] mix-blend-overlay pointer-events-none" />
                      
                      {/* Top status indicator in bento banner */}
                      <div className="relative z-20 flex justify-between items-start">
                        <span className="bg-indigo-600 text-white text-[10px] font-bold py-1 px-3.5 rounded-full tracking-wider uppercase">
                          FEATURED CLASSIC
                        </span>
                        
                        <div className="bg-slate-950/80 backdrop-blur rounded-2xl p-3 border border-slate-800 text-right">
                          <div className="text-[9px] text-slate-500 tracking-wider uppercase font-mono">Simulated Ping</div>
                          <div className="text-sm font-mono text-emerald-400 font-bold">14ms • ONLINE</div>
                        </div>
                      </div>

                      {/* Content block aligned to bottom with beautiful overlay */}
                      <div className="relative z-20 mt-auto">
                        <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest block mb-1">
                          {featuredGame.category}
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2 uppercase font-sans">
                          {featuredGame.title}
                        </h2>
                        <p className="text-slate-400 text-xs sm:text-sm max-w-sm mb-4 line-clamp-2">
                          {featuredGame.description}
                        </p>
                        <div className="flex gap-2">
                          <button 
                            id="featured-play-btn"
                            onClick={() => handleSelectGame(featuredGame)}
                            className="bg-white text-slate-950 font-extrabold text-xs py-3 px-6 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer uppercase tracking-wider shadow-lg shadow-black/10 font-sans"
                          >
                            PLAY RETRO GAME
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Bento 2: Hot / Trending Mini-Widget */}
              <div 
                onClick={() => {
                  const targetHot = games.find(g => g.id === 'clumsy-bird') || games[1] || games[0];
                  if (targetHot) handleSelectGame(targetHot);
                }}
                className="bg-gradient-to-br from-rose-500 to-orange-500 rounded-3xl p-6 flex flex-col justify-between text-white cursor-pointer hover:scale-[1.01] transition-transform shadow-lg shadow-black/10 relative overflow-hidden group min-h-[160px]"
              >
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center text-xl">🔥</div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full">HOT ARCADE</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold leading-none tracking-tight uppercase font-sans">
                    {(games.find(g => g.id === 'clumsy-bird') || games[1] || games[0])?.title || 'CLUMSY BIRD'}
                  </h3>
                  <p className="text-[10px] opacity-90 mt-1.5 font-mono">
                    Slide through pipes • Play Unblocked
                  </p>
                </div>
              </div>

              {/* Bento 3: Import / New releases quick creator */}
              <div 
                onClick={() => setShowAddModal(true)}
                className="bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-700/60 hover:bg-slate-850/40 transition-colors group min-h-[160px]"
              >
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:bg-slate-750 transition-colors">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
                </div>
                <h3 className="font-bold text-slate-200 tracking-tight text-sm uppercase font-sans">IMPORT AN IFRAME</h3>
                <p className="text-xs text-slate-500 mt-1.5 max-w-[160px] font-sans">
                  Add any HTML5 web game URL cleanly
                </p>
              </div>

              {/* Bento 4 & 5: Horizontal Stats Summary Bar (Spans 2 columns on lg) */}
              <div className="col-span-1 md:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 p-6 flex items-center justify-around gap-4 min-h-[110px]">
                <div className="text-center flex-1">
                  <div className="text-2xl font-black text-white">{games.length}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono mt-0.5">Total Games</div>
                </div>
                <div className="h-12 w-[1px] bg-slate-800 shrink-0"></div>
                
                <div className="text-center flex-1">
                  <div className="text-2xl font-black text-indigo-400">{favorites.length}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono mt-0.5">Favorited</div>
                </div>
                <div className="h-12 w-[1px] bg-slate-800 shrink-0"></div>

                <div className="text-center flex-1">
                  <div className="text-2xl font-black text-emerald-400">99.9%</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono mt-0.5">Uptime Status</div>
                </div>
              </div>

              {/* Bento 6: Social / Sandbox Info Block (Spans 2 columns on lg) */}
              <div className="col-span-1 md:col-span-2 bg-indigo-600 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white min-h-[110px]">
                <div>
                  <h3 className="text-xl font-black tracking-tight uppercase font-sans">SECURE SANDBOX ACTIVE</h3>
                  <p className="text-indigo-200 text-xs mt-1 max-w-sm font-sans">
                    No proxy downloads, no complex setups. Each classic simulation plays inside an isolated, frame-secure iframe container.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    const samplePuzzle = games.find(g => g.id === '2048');
                    if (samplePuzzle) handleSelectGame(samplePuzzle);
                  }}
                  className="bg-slate-950 text-white font-bold py-2.5 px-5 rounded-2xl text-xs hover:bg-slate-905 transition-colors cursor-pointer shrink-0 uppercase tracking-wider font-mono shadow"
                >
                  LOAD 2048
                </button>
              </div>

            </div>

            {/* Recently Played mini-history tracker */}
            {recentGames.length > 0 && (
              <div id="recently-played-section" className="bg-slate-900/20 p-4 rounded-3xl border border-slate-900 flex flex-col gap-3">
                <h3 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Recently Played
                  </span>
                  <button
                    id="clear-recents-btn"
                    onClick={() => {
                      setRecentPlays([]);
                      localStorage.removeItem('unblocked_recent_plays');
                    }}
                    className="text-slate-500 hover:text-slate-300 transition-colors text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    Clear History
                  </button>
                </h3>

                <div className="flex flex-wrap gap-2.5">
                  {recentGames.map((game) => (
                    <div
                      key={`recent-${game.id}`}
                      id={`recent-item-${game.id}`}
                      onClick={() => handleSelectGame(game)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 cursor-pointer text-xs font-semibold text-slate-350 hover:text-white transition-all transform hover:translate-y-[-1px] font-sans"
                    >
                      <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${game.color || 'from-indigo-500 to-purple-600'}`} />
                      {game.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Filter Tabs Category Section */}
            <div className="flex flex-col gap-6 mt-4">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center border-b border-slate-850 pb-4">
                
                {/* Categories Navigation Bar resembling clean typography design */}
                <nav 
                  id="categories-tab-bar" 
                  className="flex items-center gap-5 sm:gap-7 overflow-x-auto select-none no-scrollbar py-1"
                >
                  {[
                    { name: 'All', icon: Grid },
                    { name: 'Arcade', icon: Flame },
                    { name: 'Puzzle', icon: HelpCircle },
                    { name: 'Skill', icon: Sparkles },
                    { name: 'Retro', icon: TrendingUp },
                    { name: 'Favorites', icon: Heart },
                    { name: 'Custom', icon: Gamepad2 }
                  ].map((item) => {
                    const isActive = selectedCategory === item.name;
                    return (
                      <button
                        key={item.name}
                        id={`tab-category-${item.name.toLowerCase()}`}
                        onClick={() => setSelectedCategory(item.name)}
                        className={`text-xs font-bold tracking-widest uppercase cursor-pointer transition-colors shrink-0 pb-1.5 border-b-2 ${
                          isActive
                            ? 'text-indigo-400 border-indigo-500 font-black'
                            : 'text-slate-450 border-transparent hover:text-slate-200'
                        }`}
                      >
                        {item.name}
                        {item.name === 'Favorites' && favorites.length > 0 && (
                          <span className="ml-1.5 px-2 py-0.5 text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full font-mono font-bold">
                            {favorites.length}
                          </span>
                        )}
                        {item.name === 'Custom' && games.filter(g => g.custom).length > 0 && (
                          <span className="ml-1.5 px-2 py-0.5 text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full font-mono font-bold">
                            {games.filter(g => g.custom).length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                {/* Filter / Result Statistics */}
                <span className="text-[10px] uppercase font-mono font-bold text-slate-500 self-end">
                  Showing {filteredGames.length} of {games.length} simulations
                </span>
              </div>

              {/* Display Listings Grid */}
              {filteredGames.length > 0 ? (
                <div id="games-grid-layout" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredGames.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      isFavorite={favorites.includes(game.id)}
                      onSelect={handleSelectGame}
                      onToggleFavorite={handleToggleFavorite}
                      onDeleteCustom={handleDeleteCustomGame}
                    />
                  ))}
                </div>
              ) : (
                // Empty State UI
                <div id="grid-empty-state" className="py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-5">
                    <Gamepad2 className="w-8 h-8" />
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-200 font-sans">No Games Found</h3>
                  
                  <p className="text-sm text-slate-400 mt-2 font-sans leading-relaxed">
                    {selectedCategory === 'Favorites' 
                      ? "You haven't pinned any favorite games yet! Tap the heart button on any game card to bookmark them."
                      : selectedCategory === 'Custom'
                      ? "No user-entered game URLs in your collection yet. Tap the import button to add game setups."
                      : "No matches found under those filter conditions. Check your spelling or try resetting the category."}
                  </p>

                  {selectedCategory !== 'All' || searchQuery !== '' ? (
                    <button
                      id="reset-grid-filters-btn"
                      onClick={() => {
                        setSelectedCategory('All');
                        setSearchQuery('');
                      }}
                      className="mt-6 px-4 py-2 text-xs font-mono font-semibold bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 transition-colors"
                    >
                      Clear All Filters
                    </button>
                  ) : (
                    <button
                      id="empty-state-add-custom-btn"
                      onClick={() => setShowAddModal(true)}
                      className="mt-6 px-5 py-2.5 text-xs font-mono font-bold uppercase bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
                    >
                      <Plus className="w-4 h-4" />
                      Add Custom Game
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Styled Footer aligned perfectly with GLITCH UNBLOCKED theme */}
      <footer className="h-16 border-t border-slate-850 flex flex-col sm:flex-row items-center justify-between px-8 text-[10px] text-slate-500 uppercase tracking-tighter bg-slate-950/60 shrink-0 py-4 sm:py-0 text-center gap-2">
        <div>&copy; 2026 GLITCH UNBLOCKED NETWORKS</div>
        <div className="flex flex-wrap gap-4 sm:gap-6 justify-center">
          <span className="hover:text-white transition-colors cursor-pointer">Local Browser Persistence</span>
          <span className="hover:text-white transition-colors cursor-pointer">DMCA compliant</span>
          <div className="flex items-center gap-2 font-semibold">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            SYSTEMS OPERATIONAL
          </div>
        </div>
      </footer>

      {/* Add custom game dynamic modal */}
      {showAddModal && (
        <AddGameForm 
          onClose={() => setShowAddModal(false)}
          onAddSubscribedGame={handleAddCustomGame}
        />
      )}

    </div>
  );
}
