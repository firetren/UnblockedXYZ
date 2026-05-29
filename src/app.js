/**
 * Unblocked games catalog and action state engine.
 * Vanilla JS client implementation for lightweight, 100% unblocked performance.
 */

// Local persistence keys
const CUSTOM_STORAGE_KEY = 'unblocked_custom_games';
const FAV_STORAGE_KEY = 'unblocked_favorites';
const RECENT_STORAGE_KEY = 'unblocked_recent_plays';

// Core State variables
let gamesData = [];
let favorites = [];
let recentPlays = [];
let currentCategory = 'All';
let searchQuery = '';
let selectedGame = null;

// Initialize app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  // Load favorites from local storage
  try {
    favorites = JSON.parse(localStorage.getItem(FAV_STORAGE_KEY)) || [];
  } catch (e) {
    favorites = [];
  }

  // Load recent plays from local storage
  try {
    recentPlays = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY)) || [];
  } catch (e) {
    recentPlays = [];
  }

  // Fetch games from JSON
  try {
    const response = await fetch('./src/games.json');
    const defaultGames = await response.json();
    
    // Fetch custom user added games
    let customGames = [];
    try {
      customGames = JSON.parse(localStorage.getItem(CUSTOM_STORAGE_KEY)) || [];
    } catch (e) {
      customGames = [];
    }

    gamesData = [...defaultGames, ...customGames];
  } catch (err) {
    console.error('Failed to load games database, using fallback', err);
    // Hardcoded fallback in case of direct file protocol constraints
    gamesData = [
      {
        "id": "2048",
        "title": "2048",
        "description": "The viral slide-puzzle game about combining tiles with matching numbers to reach the legendary 2048 tile.",
        "iframeUrl": "https://gabrielecirulli.github.io/2048/",
        "category": "Puzzle",
        "icon": "Grid3X3",
        "instructions": "Use your arrow keys or swipe to move the tiles. When two tiles with the same number touch, they merge into one!",
        "credits": "Created by Gabriele Cirulli",
        "color": "from-amber-400 to-orange-500"
      },
      {
        "id": "clumsy-bird",
        "title": "Clumsy Bird",
        "description": "A beautiful, lightweight open-source clone of Flappy Bird. Flap your wings, avoid the obstacles, and get the high score.",
        "iframeUrl": "https://ellisonleao.github.io/clumsy-bird/",
        "category": "Skill",
        "icon": "Bird",
        "instructions": "Click, tap, or press Spacebar to flap your wings and fly. Guide the bird safely through the gaps between the pipes.",
        "credits": "Created by Ellison Leão",
        "color": "from-teal-400 to-emerald-500"
      },
      {
        "id": "html5-snake",
        "title": "Retro Snake",
        "description": "The absolute classic arcade game. Steer the snake, eat the food nuggets, and grow longer without crashing into the walls or yourself.",
        "iframeUrl": "https://code-boxer.github.io/snake/",
        "category": "Retro",
        "icon": "TrendingUp",
        "instructions": "Use Arrow keys to instantly control the direction of the snake. Collect the foods to grow and gain points.",
        "credits": "Created by Code-Boxer",
        "color": "from-green-400 to-emerald-600"
      }
    ];
  }

  // Setup Static DOM UI listeners
  setupEventListeners();

  // Draw homescreen
  renderUI();
}

/**
 * Event bindings configuration for user commands
 */
function setupEventListeners() {
  // Global search input bars
  const searchBar = document.getElementById('header-search-bar');
  if (searchBar) {
    searchBar.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderActiveGrid();
    });
  }

  const searchBarMobile = document.getElementById('header-search-bar-mobile');
  if (searchBarMobile) {
    searchBarMobile.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderActiveGrid();
    });
  }

  // Nav category tabs
  const tabContainer = document.getElementById('categories-tab-bar');
  if (tabContainer) {
    tabContainer.addEventListener('click', (e) => {
      const button = e.target.closest('[data-category]');
      if (button) {
        currentCategory = button.getAttribute('data-category');
        
        // Update selection styling
        tabContainer.querySelectorAll('[data-category]').forEach(btn => {
          btn.classList.remove('text-indigo-400', 'border-indigo-500', 'font-black');
          btn.classList.add('text-slate-400', 'border-transparent');
        });
        button.classList.add('text-indigo-400', 'border-indigo-500', 'font-black');
        button.classList.remove('text-slate-400', 'border-transparent');

        renderActiveGrid();
      }
    });
  }

  // Logo back navigation
  const logoBtn = document.getElementById('brand-header-logo-group');
  if (logoBtn) {
    logoBtn.addEventListener('click', () => {
      closeSelectedGame();
    });
  }

  // Add Game modal triggering
  const addButtons = [
    document.getElementById('cta-add-custom-game-nav'),
    document.getElementById('cta-hero-add-custom'),
    document.getElementById('bento-import-trigger')
  ];

  addButtons.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSubmitModal();
      });
    }
  });

  // Modal configuration
  const modalCancel = document.getElementById('form-cancel-btn');
  const modalClose = document.getElementById('close-modal-btn');
  if (modalCancel) modalCancel.addEventListener('click', closeSubmitModal);
  if (modalClose) modalClose.addEventListener('click', closeSubmitModal);

  // Form submission logic
  const customForm = document.getElementById('custom-game-add-form');
  if (customForm) {
    customForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormSubmit();
    });
  }

  // Embedded banner quick play load button
  const load2048Btn = document.getElementById('bento-load-2048-btn');
  if (load2048Btn) {
    load2048Btn.addEventListener('click', () => {
      const match = gamesData.find(g => g.id === '2048');
      if (match) launchGame(match);
    });
  }
}

/**
 * Orchestrate complete UI redraw
 */
function renderUI() {
  // 1. Setup metadata values on homescreen
  const totalCountEl = document.getElementById('stats-total-count');
  if (totalCountEl) totalCountEl.textContent = gamesData.length;

  const favCountEl = document.getElementById('stats-fav-count');
  if (favCountEl) favCountEl.textContent = favorites.length;

  // Add badges to categories nav
  const favBadge = document.getElementById('fav-category-badge');
  if (favBadge) {
    if (favorites.length > 0) {
      favBadge.textContent = favorites.length;
      favBadge.classList.remove('hidden');
    } else {
      favBadge.classList.add('hidden');
    }
  }

  const customBadge = document.getElementById('custom-category-badge');
  const customCount = gamesData.filter(g => g.custom).length;
  if (customBadge) {
    if (customCount > 0) {
      customBadge.textContent = customCount;
      customBadge.classList.remove('hidden');
    } else {
      customBadge.classList.add('hidden');
    }
  }

  // 2. Setup featured game banner detail
  const featuredGame = gamesData.find(g => g.id === 'html5-snake') || gamesData[0];
  if (featuredGame) {
    const featuredCategory = document.getElementById('featured-game-category');
    const featuredTitle = document.getElementById('featured-game-title');
    const featuredDesc = document.getElementById('featured-game-desc');
    const featuredBtn = document.getElementById('featured-play-btn');

    if (featuredCategory) featuredCategory.textContent = featuredGame.category;
    if (featuredTitle) featuredTitle.textContent = featuredGame.title;
    if (featuredDesc) featuredDesc.textContent = featuredGame.description;
    
    if (featuredBtn) {
      // Re-add listener to play featured game
      const newBtn = featuredBtn.cloneNode(true);
      featuredBtn.parentNode.replaceChild(newBtn, featuredBtn);
      newBtn.addEventListener('click', () => launchGame(featuredGame));
    }
  }

  // 3. Render Recents Tray
  renderRecentsTray();

  // 4. Render main cards layout grid
  renderActiveGrid();
}

/**
 * Display recent plays listing bar
 */
function renderRecentsTray() {
  const container = document.getElementById('recently-played-list-container');
  const section = document.getElementById('recently-played-section');
  
  if (!container || !section) return;

  const validRecents = recentPlays
    .map(id => gamesData.find(g => g.id === id))
    .filter(g => !!g);

  if (validRecents.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  container.innerHTML = '';

  validRecents.forEach(game => {
    const el = document.createElement('div');
    el.className = 'flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 cursor-pointer text-xs font-semibold text-slate-350 hover:text-white transition-all transform hover:translate-y-[-1px]';
    el.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-gradient-to-r ${game.color || 'from-indigo-500 to-purple-600'}"></span>
      <span>${escapeHTML(game.title)}</span>
    `;
    el.addEventListener('click', () => launchGame(game));
    container.appendChild(el);
  });

  // Re-establish clear history command
  const clearBtn = document.getElementById('clear-recents-btn');
  if (clearBtn) {
    const newClearBtn = clearBtn.cloneNode(true);
    clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
    newClearBtn.addEventListener('click', () => {
      recentPlays = [];
      localStorage.removeItem(RECENT_STORAGE_KEY);
      renderUI();
    });
  }
}

/**
 * Filter games list and write HTML cards to grid viewport
 */
function renderActiveGrid() {
  const container = document.getElementById('games-grid-layout');
  const emptyState = document.getElementById('grid-empty-state');
  
  if (!container) return;

  // Perform content filtration
  const filtered = gamesData.filter(game => {
    // Search matching filter
    const matchesSearch = 
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (game.credits && game.credits.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filter categorization selection
    if (currentCategory === 'All') return true;
    if (currentCategory === 'Favorites') return favorites.includes(game.id);
    if (currentCategory === 'Custom') return game.custom === true;
    
    return game.category === currentCategory;
  });

  // Statistics indicator counts
  const statText = document.getElementById('grid-result-statistics');
  if (statText) {
    statText.textContent = `Showing ${filtered.length} of ${gamesData.length} simulations`;
  }

  if (filtered.length === 0) {
    container.classList.add('hidden');
    if (emptyState) {
      emptyState.classList.remove('hidden');
      
      // Customize empty text message
      const emptyDesc = document.getElementById('empty-state-description');
      if (emptyDesc) {
        if (currentCategory === 'Favorites') {
          emptyDesc.textContent = "You haven't pinned any favorite games yet! Tap the heart button on any game card to bookmark them.";
        } else if (currentCategory === 'Custom') {
          emptyDesc.textContent = "No user-entered game URLs in your collection yet. Tap the import button to add game setups.";
        } else {
          emptyDesc.textContent = "No matches found under those filter conditions. Check your spelling or try resetting the category.";
        }
      }

      // Re-establish empty state triggers
      const emptyActionBtn = document.getElementById('empty-state-action-btn');
      if (emptyActionBtn) {
        const newEmptyBtn = emptyActionBtn.cloneNode(true);
        emptyActionBtn.parentNode.replaceChild(newEmptyBtn, emptyActionBtn);
        
        if (currentCategory !== 'All' || searchQuery !== '') {
          newEmptyBtn.textContent = 'Clear All Filters';
          newEmptyBtn.addEventListener('click', () => {
            currentCategory = 'All';
            searchQuery = '';
            
            // Sync with elements
            const searchBar = document.getElementById('header-search-bar');
            if (searchBar) searchBar.value = '';
            const searchBarMobile = document.getElementById('header-search-bar-mobile');
            if (searchBarMobile) searchBarMobile.value = '';

            // Reset tab highlights
            const tabContainer = document.getElementById('categories-tab-bar');
            if (tabContainer) {
              tabContainer.querySelectorAll('[data-category]').forEach(btn => {
                const cat = btn.getAttribute('data-category');
                if (cat === 'All') {
                  btn.classList.add('text-indigo-400', 'border-indigo-500', 'font-black');
                } else {
                  btn.classList.remove('text-indigo-400', 'border-indigo-500', 'font-black');
                  btn.classList.add('text-slate-400', 'border-transparent');
                }
              });
            }

            renderActiveGrid();
          });
        } else {
          newEmptyBtn.innerHTML = `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg> Add Custom Game`;
          newEmptyBtn.addEventListener('click', openSubmitModal);
        }
      }
    }
    return;
  }

  // Normal active display render
  if (emptyState) emptyState.classList.add('hidden');
  container.classList.remove('hidden');
  container.innerHTML = '';

  filtered.forEach(game => {
    const isFav = favorites.includes(game.id);
    const gradientColor = game.color || 'from-indigo-500 to-purple-600';
    const card = document.createElement('div');
    
    card.id = `game-card-${game.id}`;
    card.className = "group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-800/60 border border-slate-700/50 backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:border-slate-500/50 hover:shadow-[0_10px_30px_rgba(0,0,0,0.30)] flex flex-col justify-between h-56";
    
    card.innerHTML = `
      <!-- Hover dynamic glow overlay -->
      <div class="absolute inset-0 bg-gradient-to-br ${gradientColor} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 pointer-events-none"></div>

      <!-- Main card action layout -->
      <div class="p-5 flex-1 flex flex-col">
        <div class="flex items-start justify-between gap-4">
          <!-- Card Icon Badge -->
          <div class="p-3 rounded-xl bg-gradient-to-br ${gradientColor} shadow-lg shadow-black/20 text-white transform group-hover:scale-110 transition-transform duration-300">
            ${getIconSVG(game.icon, 'w-5 h-5')}
          </div>

          <!-- Card Button controls -->
          <div class="flex gap-1.5 z-10">
            <button
              data-action="toggle-fav"
              class="p-2 rounded-lg bg-slate-900/60 transition-colors border hover:bg-slate-900 cursor-pointer ${
                isFav 
                  ? 'text-pink-500 border-pink-500/30' 
                  : 'text-slate-400 border-slate-700 hover:text-slate-200'
              }"
              title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}"
            >
              <svg class="w-4 h-4 ${isFav ? 'fill-current' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </button>

            ${game.custom ? `
              <button
                data-action="delete-custom"
                class="p-2 rounded-lg bg-slate-900/60 text-rose-500 border border-rose-500/30 hover:bg-rose-955 transition-colors cursor-pointer"
                title="Delete custom game"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            ` : ''}
          </div>
        </div>

        <div class="mt-4">
          <div class="flex items-center gap-2">
            <h3 class="text-lg font-bold text-slate-100 tracking-tight group-hover:text-white line-clamp-1">
              ${escapeHTML(game.title)}
            </h3>
            ${game.custom ? `
              <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                User
              </span>
            ` : ''}
          </div>
          <p class="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed flex-grow">
            ${escapeHTML(game.description)}
          </p>
        </div>
      </div>

      <!-- Card footer status strip -->
      <div class="px-5 py-3.5 bg-slate-900/40 border-t border-slate-800/60 flex items-center justify-between text-xs">
        <span class="font-mono text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          ${escapeHTML(game.category)}
        </span>

        <span class="flex items-center gap-1 font-bold text-slate-300 group-hover:text-white transition-colors">
          PLAY GAME <svg class="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </span>
      </div>
    `;

    // Intercept action button clicks inside cards
    card.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('button[data-action]');
      if (targetBtn) {
        e.stopPropagation();
        const actionType = targetBtn.getAttribute('data-action');
        if (actionType === 'toggle-fav') {
          toggleFavoriteFromCard(game, targetBtn);
        } else if (actionType === 'delete-custom') {
          deleteCustomGameFromCard(game.id);
        }
        return;
      }
      launchGame(game);
    });

    container.appendChild(card);
  });

  // Automatically update newly created SVG icons in grid
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Handle favorite pinning inside the cards grid
 */
function toggleFavoriteFromCard(game, btnElement) {
  let updated;
  if (favorites.includes(game.id)) {
    updated = favorites.filter(id => id !== game.id);
    btnElement.classList.remove('text-pink-500', 'border-pink-500/30');
    btnElement.classList.add('text-slate-400', 'border-slate-700', 'hover:text-slate-200');
    btnElement.querySelector('svg').classList.remove('fill-current');
  } else {
    updated = [...favorites, game.id];
    btnElement.classList.add('text-pink-500', 'border-pink-500/30');
    btnElement.classList.remove('text-slate-400', 'border-slate-700', 'hover:text-slate-200');
    btnElement.querySelector('svg').classList.add('fill-current');
  }
  favorites = updated;
  localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(updated));
  renderUI();
}

/**
 * Perform target deletion of custom added list elements
 */
function deleteCustomGameFromCard(id) {
  if (!window.confirm('Are you sure you want to delete this custom game from your catalog?')) {
    return;
  }

  let customList = [];
  try {
    customList = JSON.parse(localStorage.getItem(CUSTOM_STORAGE_KEY)) || [];
  } catch (err) {
    customList = [];
  }

  const filtered = customList.filter(g => g.id !== id);
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(filtered));
  
  const staticCopy = gamesData.filter(g => !g.custom);
  gamesData = [...staticCopy, ...filtered];

  // Clean values
  favorites = favorites.filter(fId => fId !== id);
  localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favorites));

  recentPlays = recentPlays.filter(rId => rId !== id);
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentPlays));

  renderUI();
}

/**
 * Launch active game inside Play Arena Iframe player
 */
function launchGame(game) {
  selectedGame = game;

  // Add game to recents (Max 5 entries)
  const updatedRecent = [game.id, ...recentPlays.filter(id => id !== game.id)].slice(0, 5);
  recentPlays = updatedRecent;
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updatedRecent));

  // Swap Screen element displays
  document.getElementById('homescreen-browser-layout').classList.add('hidden');
  const arena = document.getElementById('game-play-arena-layout');
  arena.classList.remove('hidden');

  // Trigger Arena setup markup loader
  setupArenaView(game);

  // Smooth scroll to focus gameplay panel
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeSelectedGame() {
  selectedGame = null;
  document.getElementById('game-play-arena-layout').classList.add('hidden');
  document.getElementById('homescreen-browser-layout').classList.remove('hidden');
  
  // Stop iframe from continuing audio or script threads
  const iframeContainer = document.getElementById('play-arena-frame-viewport-container');
  if (iframeContainer) {
    iframeContainer.innerHTML = '';
  }

  renderUI();
}

/**
 * Dynamic content population inside Play Arena frame wrapper
 */
function setupArenaView(game) {
  const gradientColor = game.color || 'from-indigo-500 to-purple-600';

  // Title displays
  document.getElementById('arena-game-label').textContent = game.title;
  document.getElementById('arena-game-category').textContent = game.category;
  document.getElementById('arena-game-instructions').textContent = game.instructions || 'Click inside the frame, then use standard mouse controls or keyboard arrows to steer.';
  document.getElementById('arena-game-credits-name').textContent = game.credits || 'Independent Open-Source Developer';

  // Toggle user badge in play modal
  const arenaUserBadge = document.getElementById('arena-game-user-badge');
  if (arenaUserBadge) {
    if (game.custom) {
      arenaUserBadge.classList.remove('hidden');
    } else {
      arenaUserBadge.classList.add('hidden');
    }
  }

  // Active Icon badge
  const iconContainer = document.getElementById('arena-game-icon-container');
  if (iconContainer) {
    iconContainer.className = `p-2 rounded-lg bg-gradient-to-br ${gradientColor} text-white shadow-md`;
    iconContainer.innerHTML = getIconSVG(game.icon, 'w-5 h-5');
  }

  // Setup Favorite btn color state
  const favBtn = document.getElementById('arena-favorite-btn');
  if (favBtn) {
    const isFav = favorites.includes(game.id);
    if (isFav) {
      favBtn.className = "flex items-center gap-2 px-3.5 py-2 text-sm font-bold rounded-xl border text-pink-500 bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20 cursor-pointer transition-all";
      favBtn.innerHTML = `<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg> <span class="hidden md:inline">Favorited</span>`;
    } else {
      favBtn.className = "flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-750 hover:text-white cursor-pointer transition-all";
      favBtn.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg> <span class="hidden md:inline">Add Favorite</span>`;
    }

    // Bind button events
    const newFavBtn = favBtn.cloneNode(true);
    favBtn.parentNode.replaceChild(newClearBtnHandler(newFavBtn, () => {
      toggleFavoriteFromCard(game, newFavBtn);
      // Re-run status update
      setupArenaView(game);
    }), favBtn);
  }

  // Populate actual active iFrame element
  const iframeContainer = document.getElementById('play-arena-frame-viewport-container');
  if (iframeContainer) {
    iframeContainer.innerHTML = `
      <!-- Loading indicator -->
      <div id="play-loading-splash" class="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center z-10 p-6 text-center">
        <div class="p-4 rounded-2xl bg-gradient-to-br ${gradientColor} mb-5 shadow-lg animate-bounce text-white">
          ${getIconSVG(game.icon, 'w-8 h-8')}
        </div>
        <h3 class="text-lg font-black text-white uppercase tracking-tight">Booting ${escapeHTML(game.title)}...</h3>
        <p class="text-xs text-slate-400 mt-2 max-w-xs font-mono font-light">Preparing secure unblocked sandbox container to fetch web assets</p>
        <div class="w-48 h-1.5 bg-slate-800 rounded-full mt-6 overflow-hidden">
          <div class="w-full h-full bg-gradient-to-r ${gradientColor} origin-left animate-pulse"></div>
        </div>
      </div>

      <!-- Iframe -->
      <iframe
        id="game-active-iframe"
        src="${game.iframeUrl}"
        title="Play ${escapeHTML(game.title)} Unblocked"
        class="w-full h-full border-0 absolute inset-0"
        allow="autoplay; fullscreen; gamepad; focus; keyboard"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
        referrerpolicy="no-referrer"
      ></iframe>
    `;

    const iframeEl = document.getElementById('game-active-iframe');
    if (iframeEl) {
      iframeEl.addEventListener('load', () => {
        const splash = document.getElementById('play-loading-splash');
        if (splash) splash.classList.add('hidden');
      });
    }
  }

  // Reload action handler
  const reloadBtn = document.getElementById('arena-reload-btn');
  if (reloadBtn) {
    const newReload = reloadBtn.cloneNode(true);
    reloadBtn.parentNode.replaceChild(newClearBtnHandler(newReload, () => {
      setupArenaView(game);
    }), reloadBtn);
  }

  // Back button in play arena
  const backBtn = document.getElementById('back-to-catalog-btn');
  if (backBtn) {
    const newBack = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newClearBtnHandler(newBack, () => {
      closeSelectedGame();
    }), backBtn);
  }

  // Fullscreen management listeners
  const fullBtn = document.getElementById('arena-fullscreen-btn');
  if (fullBtn) {
    const newFull = fullBtn.cloneNode(true);
    fullBtn.parentNode.replaceChild(newClearBtnHandler(newFull, () => {
      const targetWrap = document.getElementById('play-arena-frame-viewport-wrapper');
      if (targetWrap) {
        if (!document.fullscreenElement) {
          targetWrap.requestFullscreen().catch(err => {
            console.error('Fullscreen API failed', err);
          });
        } else {
          document.exitFullscreen();
        }
      }
    }), fullBtn);
  }

  // Theater width layout adjustment
  const theaterBtn = document.getElementById('arena-theater-btn');
  if (theaterBtn) {
    const newTheater = theaterBtn.cloneNode(true);
    theaterBtn.parentNode.replaceChild(newClearBtnHandler(newTheater, () => {
      const arenaGrid = document.getElementById('play-arena-grid-layout');
      if (arenaGrid) {
        const isTheaterActive = arenaGrid.classList.contains('lg:grid-cols-1');
        if (isTheaterActive) {
          arenaGrid.classList.remove('lg:grid-cols-1', 'max-w-full');
          arenaGrid.classList.add('lg:grid-cols-3', 'max-w-6xl');
          newTheater.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg> <span class="hidden md:inline">Theater Grid</span>`;
        } else {
          arenaGrid.classList.remove('lg:grid-cols-3', 'max-w-6xl');
          arenaGrid.classList.add('lg:grid-cols-1', 'max-w-full');
          newTheater.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg> <span class="hidden md:inline">Normal View</span>`;
        }
      }
    }), theaterBtn);
  }
}

function newClearBtnHandler(cloned, action) {
  cloned.addEventListener('click', (e) => {
    e.stopPropagation();
    action();
  });
  return cloned;
}

/**
 * Handle user submit custom simulation configurations
 */
function handleFormSubmit() {
  const title = document.getElementById('input-game-title').value.trim();
  const description = document.getElementById('input-game-desc').value.trim();
  const iframeUrl = document.getElementById('input-game-url').value.trim();
  const category = document.getElementById('select-game-category').value;
  const credits = document.getElementById('input-game-credits').value.trim();
  const instructions = document.getElementById('input-game-instructions').value.trim();

  const errorBanner = document.getElementById('form-error-banner');
  if (errorBanner) errorBanner.classList.add('hidden');

  if (!title || !description || !iframeUrl) {
    showFormError('Please fill out all required fields.');
    return;
  }

  if (!iframeUrl.startsWith('http://') && !iframeUrl.startsWith('https://')) {
    showFormError('URL is invalid. Must commence with http:// or https://');
    return;
  }

  // Create new game schema
  const gradientPresets = [
    'from-pink-500 to-rose-600',
    'from-teal-400 to-emerald-500',
    'from-purple-500 to-indigo-600',
    'from-amber-400 to-orange-500',
    'from-sky-500 to-blue-600'
  ];
  const randomGradient = gradientPresets[Math.floor(Math.random() * gradientPresets.length)];

  const newGame = {
    id: `custom-game-${Date.now()}`,
    title: title,
    description: description,
    iframeUrl: iframeUrl,
    category: category,
    icon: 'Gamepad2',
    instructions: instructions || 'Click inside frame and steer simulation using keyboard coordinates.',
    credits: credits || 'Independent Sandbox Dev',
    color: randomGradient,
    custom: true
  };

  // Persist game locally array
  let stored = [];
  try {
    stored = JSON.parse(localStorage.getItem(CUSTOM_STORAGE_KEY)) || [];
  } catch (e) {
    stored = [];
  }
  stored.push(newGame);
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(stored));

  // Sync state data
  const baseGames = gamesData.filter(g => !g.custom);
  gamesData = [...baseGames, ...stored];

  // Render visual success page inside modal
  const formElement = document.getElementById('custom-game-add-form');
  const modalSuccess = document.getElementById('add-game-success-message');
  
  if (formElement && modalSuccess) {
    formElement.classList.add('hidden');
    modalSuccess.classList.remove('hidden');
    
    setTimeout(() => {
      // Clear forms
      formElement.reset();
      formElement.classList.remove('hidden');
      modalSuccess.classList.add('hidden');
      
      closeSubmitModal();
      renderUI();
    }, 1500);
  }
}

function showFormError(msg) {
  const banner = document.getElementById('form-error-banner');
  if (banner) {
    banner.textContent = msg;
    banner.classList.remove('hidden');
  }
}

/**
 * Trigger Modal popups
 */
function openSubmitModal() {
  const modal = document.getElementById('add-game-modal-ambient');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeSubmitModal() {
  const modal = document.getElementById('add-game-modal-ambient');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }
}

/**
 * Fallback static icon SVGs for lightweight Vanilla integration
 */
function getIconSVG(name, cls) {
  switch (name) {
    case 'Grid3X3':
      return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>`;
    case 'Bird':
      return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 12a4 4 0 0 1-8 0v-1a4 4 0 0 1 8 0Zm0-3h-8Zm8-3V4c0-.5-.5-1-1-1h-2a2 2 0 0 0-2 2v2M4 7h16M4 21c0-1.5 1-3 2.5-3h11c1.5 0 2.5 1.5 2.5 3"/></svg>`;
    case 'Hexagon':
      return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`;
    case 'TrendingUp':
      return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`;
    case 'CircleDot':
      return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg>`;
    case 'Sparkles':
      return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
    case 'Keyboard':
      return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M10 14h4"/></svg>`;
    default:
      return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>`;
  }
}

/**
 * Escapes HTML strings to bypass injection risks
 */
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
