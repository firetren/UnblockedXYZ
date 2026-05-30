/**
 * Unblocked games catalog and action state engine.
 * Vanilla JS client implementation for lightweight, 100% unblocked performance.
 */

// Local persistence keys
const CUSTOM_STORAGE_KEY = 'unblocked_custom_games';
const FAV_STORAGE_KEY = 'unblocked_favorites';
const RECENT_STORAGE_KEY = 'unblocked_recent_plays';
const THUMBNAILS_STORAGE_KEY = 'unblocked_custom_thumbnails';

// Core State variables
let gamesData = [];
let favorites = [];
let recentPlays = [];
let currentCategory = 'All';
let searchQuery = '';
let selectedGame = null;
let editingGameForThumbnail = null;

/**
 * Normalizes input raw URLs or copy-pasted iframe code.
 * Converts hotlinked CrazyGames CDN URLs into the clean official player.
 */
function cleanGameUrl(url) {
  if (!url) return '';
  let clean = url.trim();

  // If the user pasted an iframe HTML tag, extract the src attribute
  if (clean.includes('<iframe') && clean.includes('src=')) {
    const srcMatch = clean.match(/src="([^"]+)"/) || clean.match(/src='([^']+)'/);
    if (srcMatch && srcMatch[1]) {
      clean = srcMatch[1];
    }
  }

  // Swap HTML entity &amp; to standard & character
  clean = clean.replace(/&amp;/g, '&');

  // Handle CrazyGames direct CDN or site pages
  if (clean.includes('crazygames.com')) {
    // CDN pattern: subdomain.game-files.crazygames.com
    const cdnMatch = clean.match(/https?:\/\/([^.]+)\.game-files\.crazygames\.com/);
    if (cdnMatch && cdnMatch[1]) {
      return `https://www.crazygames.com/embed/${cdnMatch[1]}`;
    }

    // Locale game frame pattern: games.crazygames.com/en_US/slug/index.html or similar
    const localizedMatch = clean.match(/https?:\/\/games\.crazygames\.com\/[a-z]{2}_[A-Z]{2}\/([^/]+)\/index\.html/);
    if (localizedMatch && localizedMatch[1]) {
      return `https://www.crazygames.com/embed/${localizedMatch[1]}`;
    }

    // Direct game folders pattern on games.crazygames.com
    const directGamesMatch = clean.match(/games\.crazygames\.com\/[^/]+\/([^/]+)/);
    if (directGamesMatch && directGamesMatch[1] && !directGamesMatch[1].endsWith('.html')) {
      return `https://www.crazygames.com/embed/${directGamesMatch[1]}`;
    }

    // Standard game page pattern: crazygames.com/game/slug
    const pageMatch = clean.match(/crazygames\.com\/game\/([^/?#&]+)/);
    if (pageMatch && pageMatch[1]) {
      return `https://www.crazygames.com/embed/${pageMatch[1]}`;
    }

    // Direct embed pattern check (clean-up other params if needed)
    const embedMatch = clean.match(/crazygames\.com\/embed\/([^/?#&]+)/);
    if (embedMatch && embedMatch[1]) {
      return `https://www.crazygames.com/embed/${embedMatch[1]}`;
    }
  }

  return clean;
}

/**
 * Apply saved custom thumbnail overrides from localStorage to gamesData
 */
function applyCustomThumbnails() {
  let customThumbnails = {};
  try {
    customThumbnails = JSON.parse(localStorage.getItem(THUMBNAILS_STORAGE_KEY)) || {};
  } catch (e) {
    customThumbnails = {};
  }
  
  gamesData = gamesData.map(game => {
    if (customThumbnails[game.id] !== undefined) {
      const override = customThumbnails[game.id];
      if (override && typeof override === 'object') {
        return { ...game, thumbnailUrl: override.url, thumbnailFit: override.fit || 'cover' };
      }
      return { ...game, thumbnailUrl: override, thumbnailFit: 'cover' };
    }
    return game;
  });
}

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
    let defaultGames = [];
    try {
      const response = await fetch('./src/games.json?t=' + Date.now());
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      defaultGames = await response.json();
    } catch (e1) {
      try {
        const response2 = await fetch('src/games.json?t=' + Date.now());
        if (!response2.ok) throw new Error(`HTTP error! status: ${response2.status}`);
        defaultGames = await response2.json();
      } catch (e2) {
        try {
          const response3 = await fetch('./games.json?t=' + Date.now());
          if (!response3.ok) throw new Error(`HTTP error! status: ${response3.status}`);
          defaultGames = await response3.json();
        } catch (e3) {
          console.error('All fetch attempts failed:', e1, e2, e3);
        }
      }
    }

    // Fetch custom user added games
    let customGames = [];
    try {
      customGames = JSON.parse(localStorage.getItem(CUSTOM_STORAGE_KEY)) || [];
    } catch (e) {
      customGames = [];
    }

    gamesData = [...defaultGames, ...customGames];
  } catch (err) {
    console.error('Failed to load games database, using custom repository fallback', err);
    let customGames = [];
    try {
      customGames = JSON.parse(localStorage.getItem(CUSTOM_STORAGE_KEY)) || [];
    } catch (e) {
      customGames = [];
    }
    gamesData = [...customGames];
  }

  // Apply custom thumbnails overrides
  applyCustomThumbnails();

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
          btn.classList.remove('text-orange-400', 'border-orange-500', 'font-black');
          btn.classList.add('text-slate-400', 'border-transparent');
        });
        button.classList.add('text-orange-400', 'border-orange-500', 'font-black');
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

  // Edit Thumbnail Modal listeners
  const closeEditBtn = document.getElementById('close-edit-thumbnail-modal-btn');
  const cancelEditBtn = document.getElementById('edit-thumbnail-cancel-btn');
  if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditThumbnailModal);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditThumbnailModal);

  // Codebase Sync Modal listeners
  const triggerSyncBtn = document.getElementById('trigger-sync-modal');
  const triggerResetAllBtn = document.getElementById('trigger-reset-all');
  const closeSyncBtn = document.getElementById('close-sync-modal-btn');
  const cancelSyncBtn = document.getElementById('sync-close-cancel-btn');
  const copySyncBtn = document.getElementById('copy-sync-json-btn');

  if (triggerSyncBtn) {
    triggerSyncBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSyncCodebaseModal();
    });
  }
  if (triggerResetAllBtn) {
    triggerResetAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to reset all customized thumbnails, custom games, and favorites back to defaults? This will clear any outdated browser overrides.')) {
        localStorage.removeItem(CUSTOM_STORAGE_KEY);
        localStorage.removeItem(FAV_STORAGE_KEY);
        localStorage.removeItem(RECENT_STORAGE_KEY);
        localStorage.removeItem(THUMBNAILS_STORAGE_KEY);
        window.location.reload();
      }
    });
  }
  if (closeSyncBtn) closeSyncBtn.addEventListener('click', closeSyncCodebaseModal);
  if (cancelSyncBtn) cancelSyncBtn.addEventListener('click', closeSyncCodebaseModal);
  if (copySyncBtn) {
    copySyncBtn.addEventListener('click', () => {
      const textarea = document.getElementById('sync-json-textarea');
      if (textarea) {
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(textarea.value).then(() => {
          const originalText = copySyncBtn.textContent;
          copySyncBtn.textContent = 'COPIED!';
          copySyncBtn.style.backgroundColor = '#10b981';
          copySyncBtn.style.color = '#ffffff';
          setTimeout(() => {
            copySyncBtn.textContent = originalText;
            copySyncBtn.style.backgroundColor = '';
            copySyncBtn.style.color = '';
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy', err);
        });
      }
    });
  }

  const editThumbnailForm = document.getElementById('edit-thumbnail-form');
  if (editThumbnailForm) {
    editThumbnailForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!editingGameForThumbnail) return;
      
      const newUrl = document.getElementById('input-edit-thumbnail-url').value.trim();
      const newFit = document.getElementById('select-edit-thumbnail-fit').value;
      
      // Update local storage
      let customThumbnails = {};
      try {
        customThumbnails = JSON.parse(localStorage.getItem(THUMBNAILS_STORAGE_KEY)) || {};
      } catch (err) {
        customThumbnails = {};
      }
      
      customThumbnails[editingGameForThumbnail.id] = { url: newUrl, fit: newFit };
      localStorage.setItem(THUMBNAILS_STORAGE_KEY, JSON.stringify(customThumbnails));
      
      // Update in-memory data
      gamesData = gamesData.map(game => {
        if (game.id === editingGameForThumbnail.id) {
          return { ...game, thumbnailUrl: newUrl, thumbnailFit: newFit };
        }
        return game;
      });
      
      closeEditThumbnailModal();
      renderUI();
      renderActiveGrid();
    });
  }

  const editThumbnailInput = document.getElementById('input-edit-thumbnail-url');
  const editThumbnailFitSelect = document.getElementById('select-edit-thumbnail-fit');
  
  function updatePreviewClass(fit) {
    const previewImg = document.getElementById('edit-thumbnail-preview-img');
    if (previewImg) {
      if (fit === 'contain') {
        previewImg.className = "w-full h-full object-contain p-1 bg-slate-950/95";
      } else {
        previewImg.className = "w-full h-full object-cover";
      }
    }
  }

  if (editThumbnailFitSelect) {
    editThumbnailFitSelect.addEventListener('change', (e) => {
      updatePreviewClass(e.target.value);
    });
  }

  if (editThumbnailInput) {
    editThumbnailInput.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      const previewImg = document.getElementById('edit-thumbnail-preview-img');
      const previewFallback = document.getElementById('edit-thumbnail-preview-fallback');
      
      if (previewImg && previewFallback) {
        if (url) {
          previewImg.src = url;
          previewImg.classList.remove('hidden');
          previewFallback.classList.add('hidden');
        } else {
          previewImg.src = '';
          previewImg.classList.add('hidden');
          previewFallback.classList.remove('hidden');
        }
      }
    });

    const previewImg = document.getElementById('edit-thumbnail-preview-img');
    if (previewImg) {
      previewImg.addEventListener('error', () => {
        previewImg.classList.add('hidden');
        const previewFallback = document.getElementById('edit-thumbnail-preview-fallback');
        if (previewFallback) previewFallback.classList.remove('hidden');
      });
    }
  }

  const resetEditBtn = document.getElementById('edit-thumbnail-reset-btn');
  if (resetEditBtn) {
    resetEditBtn.addEventListener('click', () => {
      if (!editingGameForThumbnail) return;
      
      let customThumbnails = {};
      try {
        customThumbnails = JSON.parse(localStorage.getItem(THUMBNAILS_STORAGE_KEY)) || {};
      } catch (err) {
        customThumbnails = {};
      }
      
      delete customThumbnails[editingGameForThumbnail.id];
      localStorage.setItem(THUMBNAILS_STORAGE_KEY, JSON.stringify(customThumbnails));
      
      // Re-initialize state to default values and refresh
      initApp();
      closeEditThumbnailModal();
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
  const featuredBg = document.getElementById('featured-game-bg-image');
  
  if (featuredGame) {
    const featuredCategory = document.getElementById('featured-game-category');
    const featuredTitle = document.getElementById('featured-game-title');
    const featuredDesc = document.getElementById('featured-game-desc');
    const featuredBtn = document.getElementById('featured-play-btn');

    if (featuredCategory) featuredCategory.textContent = featuredGame.category;
    if (featuredTitle) featuredTitle.textContent = featuredGame.title;
    if (featuredDesc) featuredDesc.textContent = featuredGame.description;
    
    if (featuredBg) {
      if (featuredGame.thumbnailUrl) {
        featuredBg.style.backgroundImage = `url('${featuredGame.thumbnailUrl}')`;
        featuredBg.style.opacity = '0.35';
      } else {
        featuredBg.style.backgroundImage = 'none';
        featuredBg.style.opacity = '0.05';
      }
    }
    
    if (featuredBtn) {
      featuredBtn.textContent = "PLAY GAME";
      const newBtn = featuredBtn.cloneNode(true);
      featuredBtn.parentNode.replaceChild(newBtn, featuredBtn);
      newBtn.setAttribute('onclick', `xyzTrackPlay(); playGame('${featuredGame.id}')`);
    }
  } else {
    const featuredCategory = document.getElementById('featured-game-category');
    const featuredTitle = document.getElementById('featured-game-title');
    const featuredDesc = document.getElementById('featured-game-desc');
    const featuredBtn = document.getElementById('featured-play-btn');

    if (featuredCategory) featuredCategory.textContent = "Arcade Empty";
    if (featuredTitle) featuredTitle.textContent = "Get Started";
    if (featuredDesc) featuredDesc.textContent = "Your sandbox catalog has no simulations loaded yet. Click 'Import Game' to instantly add any unblocked game URL!";
    
    if (featuredBg) {
      featuredBg.style.backgroundImage = 'none';
      featuredBg.style.opacity = '0.05';
    }

    if (featuredBtn) {
      featuredBtn.textContent = "IMPORT FIRST GAME";
      const newBtn = featuredBtn.cloneNode(true);
      featuredBtn.parentNode.replaceChild(newBtn, featuredBtn);
      newBtn.addEventListener('click', () => openSubmitModal());
    }
  }



  // Handle 2048 quick play dynamic state
  const load2048Btn = document.getElementById('bento-load-2048-btn');
  if (load2048Btn) {
    const newBtn = load2048Btn.cloneNode(true);
    load2048Btn.parentNode.replaceChild(newBtn, load2048Btn);
    
    const has2048 = gamesData.some(g => g.id === '2048');
    if (has2048) {
      newBtn.textContent = "LOAD 2048";
      newBtn.setAttribute('onclick', "xyzTrackPlay(); playGame('2048')");
    } else {
      newBtn.textContent = "IMPORT GAME";
      newBtn.addEventListener('click', () => openSubmitModal());
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
      <span class="w-2 h-2 rounded-full bg-gradient-to-r ${game.color || 'from-amber-500 to-orange-600'}"></span>
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
                  btn.classList.add('text-orange-400', 'border-orange-500', 'font-black');
                } else {
                  btn.classList.remove('text-orange-400', 'border-orange-500', 'font-black');
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
    const gradientColor = game.color || 'from-amber-500 to-orange-600';
    const card = document.createElement('div');
    
    card.id = `game-card-${game.id}`;
    card.className = "group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 hover:border-orange-500/50 backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_12px_32px_rgba(0,0,0,0.40)] flex flex-col justify-between h-[300px]";
    
    card.innerHTML = `
      <!-- Thumbnail/Header Cover Container -->
      <div class="relative w-full h-40 overflow-hidden bg-slate-950 shrink-0">
        <!-- Floating Buttons -->
        <div class="absolute top-2.5 right-2.5 z-10 flex gap-1.5 pointer-events-auto">
          <button
            data-action="edit-thumbnail"
            class="p-1.5 rounded-lg bg-slate-955/80 border border-slate-800 text-slate-400 hover:text-orange-400 backdrop-blur transition-colors hover:bg-slate-900 cursor-pointer"
            title="Edit Thumbnail"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
            </svg>
          </button>

          <button
            data-action="toggle-fav"
            class="p-1.5 rounded-lg bg-slate-950/75 border backdrop-blur transition-colors hover:bg-slate-900 cursor-pointer ${
              isFav 
                ? 'text-pink-500 border-pink-500/30' 
                : 'text-slate-400 border-slate-800 hover:text-white'
            }"
            title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}"
          >
            <svg class="w-4 h-4 ${isFav ? 'fill-current' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>

          ${game.custom ? `
            <button
              data-action="delete-custom"
              class="p-1.5 rounded-lg bg-slate-955/75 text-rose-500 border border-slate-800 hover:bg-rose-950 hover:text-rose-450 transition-colors cursor-pointer"
              title="Delete custom game"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          ` : ''}
        </div>
        
        ${game.thumbnailUrl ? `
          <img src="${escapeHTML(game.thumbnailUrl)}" alt="${escapeHTML(game.title)}" referrerpolicy="no-referrer" class="w-full h-full ${game.thumbnailFit === 'contain' ? 'object-contain bg-slate-950/95 p-1' : 'object-cover'} transition-transform duration-500 group-hover:scale-105" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradientColor} opacity-75 hidden">
            ${getIconSVG(game.icon, 'w-10 h-10 text-white')}
          </div>
        ` : `
          <!-- Fallback to beautiful animated abstract gradient cover -->
          <div class="w-full h-full bg-gradient-to-br ${gradientColor} opacity-75 flex items-center justify-center relative">
            <div class="absolute inset-0 bg-slate-950/20"></div>
            <!-- Centered icon placeholder -->
            <div class="transform group-hover:scale-110 transition-transform duration-300">
              ${getIconSVG(game.icon, 'w-10 h-10 text-white drop-shadow-md')}
            </div>
          </div>
        `}
        <div class="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
      </div>

      <!-- Content text block -->
      <div class="p-4 flex-grow flex flex-col justify-between bg-slate-900/10">
        <div>
          <div class="flex items-center gap-2">
            ${game.thumbnailUrl ? `
              <div class="text-orange-400 shrink-0">
                ${getIconSVG(game.icon, 'w-3.5 h-3.5')}
              </div>
            ` : ''}
            <h3 class="text-[15px] font-bold text-slate-100 tracking-tight group-hover:text-white line-clamp-1">
              ${escapeHTML(game.title)}
            </h3>
            ${game.custom ? `
              <span class="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                User
              </span>
            ` : ''}
          </div>
          <p class="text-slate-400 text-[11px] leading-relaxed mt-1 line-clamp-2">
            ${escapeHTML(game.description)}
          </p>
        </div>
      </div>

      <!-- Card footer status strip -->
      <div class="px-4 py-3 bg-slate-900/60 border-t border-slate-800/60 flex items-center justify-between text-[11px] shrink-0">
        <span class="font-mono font-bold tracking-wider text-slate-400 uppercase">
          ${escapeHTML(game.category)}
        </span>

        <span class="flex items-center gap-1 font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-wider font-mono">
          PLAY <svg class="w-3.5 h-3.5 text-orange-500 transform group-hover:translate-x-1.5 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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
        } else if (actionType === 'edit-thumbnail') {
          openEditThumbnailModal(game);
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
 * Opens "Edit Thumbnail" Modal for a specific game (even global ones)
 */
function openEditThumbnailModal(game) {
  editingGameForThumbnail = game;
  
  const modal = document.getElementById('edit-thumbnail-modal-ambient');
  const subtitle = document.getElementById('edit-thumbnail-subtitle');
  const inputEl = document.getElementById('input-edit-thumbnail-url');
  const previewImg = document.getElementById('edit-thumbnail-preview-img');
  const previewFallback = document.getElementById('edit-thumbnail-preview-fallback');
  const fitSelect = document.getElementById('select-edit-thumbnail-fit');
  
  if (subtitle) {
    subtitle.innerHTML = `Customize card cover for <span class="text-orange-400 font-bold">${escapeHTML(game.title)}</span>`;
  }
  
  if (inputEl) {
    inputEl.value = game.thumbnailUrl || '';
  }
  
  if (fitSelect) {
    fitSelect.value = game.thumbnailFit || 'cover';
  }
  
  if (previewImg && previewFallback) {
    const isContain = (game.thumbnailFit === 'contain');
    previewImg.className = isContain ? 'w-full h-full object-contain p-1 bg-slate-950/95' : 'w-full h-full object-cover';
    
    if (game.thumbnailUrl) {
      previewImg.src = game.thumbnailUrl;
      previewImg.classList.remove('hidden');
      previewFallback.classList.add('hidden');
    } else {
      previewImg.src = '';
      previewImg.classList.add('hidden');
      previewFallback.classList.remove('hidden');
    }
  }
  
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeEditThumbnailModal() {
  editingGameForThumbnail = null;
  const modal = document.getElementById('edit-thumbnail-modal-ambient');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }
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

  // If matching active Firebase profile, auto-track play statistics
  if (typeof window.xyzTrackPlay === 'function') {
    window.xyzTrackPlay();
  }

  // Swap Screen element displays
  document.getElementById('homescreen-browser-layout').classList.add('hidden');
  const arena = document.getElementById('game-play-arena-layout');
  arena.classList.remove('hidden');

  // Trigger Arena setup markup loader
  setupArenaView(game);

  // Smooth scroll to focus gameplay panel
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Global window registration for playing games securely with individual account statistics tracking
window.playGame = (gameId) => {
  if (!gamesData || gamesData.length === 0) {
    console.warn("Games data not fully initialized yet.");
    return;
  }

  let targetGame = null;
  if (!gameId) {
    // Default to the featured game or the first available game in the database
    targetGame = gamesData.find(g => g.id === 'html5-snake') || gamesData[0];
  } else if (typeof gameId === 'object') {
    targetGame = gameId;
  } else {
    targetGame = gamesData.find(g => g.id === gameId);
  }

  if (targetGame) {
    launchGame(targetGame);
  } else {
    console.error(`Cannot play game - invalid game parameter or ID: ${gameId}`);
  }
};

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
  const gradientColor = game.color || 'from-amber-500 to-orange-600';

  // Title displays
  document.getElementById('arena-game-label').textContent = game.title;
  document.getElementById('arena-game-category').textContent = game.category;
  document.getElementById('arena-game-instructions').textContent = game.instructions || 'Click inside the frame, then use standard mouse controls or keyboard arrows to steer.';
  document.getElementById('arena-game-credits-name').textContent = game.credits || 'Independent Open-Source Developer';

  // Adjust progress warning text for Smash Karts vs generic games
  const warningBox = document.getElementById('arena-saves-warning-box');
  if (warningBox) {
    if (game.id === 'smash-karts') {
      warningBox.classList.add('hidden');
    } else {
      warningBox.classList.remove('hidden');
    }
  }

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
    if (game.id === 'smash-karts') {
      iconContainer.className = `w-10 h-10 rounded-lg overflow-hidden border border-slate-700 shadow-md shrink-0`;
      iconContainer.innerHTML = `<img src="https://i.ibb.co/qLydHLys/smashkarts-thumb-2.png" alt="${game.title}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />`;
    } else {
      iconContainer.className = `p-2 rounded-lg bg-gradient-to-br ${gradientColor} text-white shadow-md`;
      iconContainer.innerHTML = getIconSVG(game.icon, 'w-5 h-5');
    }
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
    const cleanedUrl = cleanGameUrl(game.iframeUrl);
    const isCrazyGame = cleanedUrl.includes('crazygames.com');
    const isSmashKarts = game.id === 'smash-karts';

    if (isCrazyGame) {
      iframeContainer.className = "w-full h-full relative overflow-hidden";
    } else {
      iframeContainer.className = "w-full h-full";
    }

    const splashWarningHTML = isSmashKarts ? `
        <!-- Custom Smash Karts account save warning card block -->
        <div class="mt-8 max-w-xs bg-rose-950/40 border border-rose-500/20 backdrop-blur-md rounded-2xl p-4 flex items-start gap-3 text-left">
          <svg class="w-5 h-5 text-rose-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <div class="text-[11px] text-rose-200 leading-relaxed font-sans">
            <span class="font-bold text-rose-300 block mb-0.5 text-xs">⚠️ unblockedxyz Accounts Do Not Save Progress</span>
            Your unblockedxyz portal account will NOT save your progress. To save your levels and stats, you must register or log in to a personal account directly inside the Smash Karts game client.
          </div>
        </div>
    ` : `
        <!-- Account progress save warning card block -->
        <div class="mt-8 max-w-xs bg-rose-950/40 border border-rose-500/20 backdrop-blur-md rounded-2xl p-4 flex items-start gap-3 text-left">
          <svg class="w-5 h-5 text-rose-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <div class="text-[11px] text-rose-200 leading-relaxed font-sans">
            <span class="font-bold text-rose-300 block mb-0.5 text-xs">⚠️ Progress is NOT saved</span>
            Active game saves, level progression, and local achievements are preserved in your temporary browser cache only and will not persist to your cloud account.
          </div>
        </div>
    `;

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
        
        ${splashWarningHTML}
      </div>

      <!-- Iframe -->
      <iframe
        id="game-active-iframe"
        src="${cleanedUrl}"
        title="Play ${escapeHTML(game.title)} Unblocked"
        class="w-full border-0 absolute"
        style="${isCrazyGame ? 'top: 0; left: 0; width: 100%; height: calc(100% + 42px);' : 'top: 0; left: 0; width: 100%; height: 100%;'}"
        allow="autoplay; fullscreen; gamepad; focus; keyboard; accelerometer; gyroscope; keyboard-map; payment"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-modals allow-orientation-lock allow-presentation allow-downloads allow-popups-to-escape-sandbox"
        referrerpolicy="no-referrer-when-downgrade"
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
  const rawUrl = document.getElementById('input-game-url').value.trim();
  const iframeUrl = cleanGameUrl(rawUrl);
  const category = document.getElementById('select-game-category').value;
  const credits = document.getElementById('input-game-credits').value.trim();
  const instructions = document.getElementById('input-game-instructions').value.trim();
  const thumbnailInput = document.getElementById('input-game-thumbnail');
  const thumbnailUrl = thumbnailInput ? thumbnailInput.value.trim() : '';

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
    thumbnailUrl: thumbnailUrl || '',
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
 * Codebase Sync Modal controls
 */
function openSyncCodebaseModal() {
  const modal = document.getElementById('sync-codebase-modal-ambient');
  const textarea = document.getElementById('sync-json-textarea');
  if (modal) {
    const baseGames = gamesData.filter(g => !g.custom).map(game => {
      const cleanGame = {
        id: game.id,
        title: game.title,
        description: game.description,
        iframeUrl: game.iframeUrl,
        category: game.category,
        icon: game.icon,
        instructions: game.instructions,
        credits: game.credits,
        color: game.color,
        thumbnailUrl: game.thumbnailUrl
      };
      if (game.thumbnailFit) {
        cleanGame.thumbnailFit = game.thumbnailFit;
      }
      return cleanGame;
    });

    if (textarea) {
      textarea.value = JSON.stringify(baseGames, null, 2);
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeSyncCodebaseModal() {
  const modal = document.getElementById('sync-codebase-modal-ambient');
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
    case 'Bus':
      return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M22 14v3a2 2 0 0 1-2 2h-1a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H4a2 2 0 0 1-2-2v-3"/><path d="M12 2H9a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V7.83a2 2 0 0 0-.59-1.41L20.17 3A2 2 0 0 0 18.76 2h-2.17"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg>`;
    case 'Car':
      return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 10h9l2 2H2"/></svg>`;
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
