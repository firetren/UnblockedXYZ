import React, { useState } from 'react';
import { X, Plus, Info, Check } from 'lucide-react';

export function AddGameForm({ onClose, onAddSubscribedGame }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');
  const [category, setCategory] = useState('Arcade');
  const [instructions, setInstructions] = useState('');
  const [credits, setCredits] = useState('');
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const categories = ['Arcade', 'Puzzle', 'Skill', 'Retro'];
  const gradientPresets = [
    'from-pink-500 to-rose-600',
    'from-teal-400 to-emerald-500',
    'from-purple-500 to-indigo-600',
    'from-amber-400 to-orange-500',
    'from-sky-500 to-blue-600'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    // Basic Fields validation
    if (!title.trim()) {
      setFormError('Please enter a game title.');
      return;
    }
    if (!description.trim()) {
      setFormError('Please enter a brief description.');
      return;
    }
    if (!iframeUrl.trim()) {
      setFormError('Please enter the iframe URL.');
      return;
    }

    // URL scheme check
    if (!iframeUrl.startsWith('http://') && !iframeUrl.startsWith('https://')) {
      setFormError('Iframe URL must begin with http:// or https://');
      return;
    }

    // Pick random gradient color preset
    const randomGradient = gradientPresets[Math.floor(Math.random() * gradientPresets.length)];

    const newGame = {
      id: `custom-game-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      iframeUrl: iframeUrl.trim(),
      category: category,
      icon: 'Gamepad2', // Default icon string
      instructions: instructions.trim() || 'Use standard game controls inside the screen frame.',
      credits: credits.trim() || 'Independent Creator',
      color: randomGradient,
      custom: true
    };

    onAddSubscribedGame(newGame);
    setIsSuccess(true);
    
    // Clear form fields
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div id="add-game-modal-ambient" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        id="add-game-modal-body"
        className="w-full max-w-lg bg-slate-900 border border-slate-805 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-zoom-in"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Plus className="w-5 h-5 animate-[pulseGlow_2s_infinite]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-sans">Add Unblocked Game</h3>
              <p className="text-xs text-slate-400 font-sans">Expand your local catalog of frameable web games</p>
            </div>
          </div>
          
          <button 
            id="close-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4.5 max-h-[75vh] overflow-y-auto">
          {isSuccess ? (
            <div id="add-game-success-message" className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/30">
                <Check className="w-8 h-8 animate-bounce" />
              </div>
              <h4 className="text-lg font-bold text-white font-sans">Game Added Successfully!</h4>
              <p className="text-sm text-slate-400 mt-1 font-sans">Saved to your local browser sandbox repository.</p>
            </div>
          ) : (
            <>
              {/* Form Validation Feedback Banner */}
              {formError && (
                <div id="form-error-banner" className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 font-mono">
                  {formError}
                </div>
              )}

              {/* Title Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">Game Title *</label>
                <input
                  id="input-game-title"
                  type="text"
                  placeholder="e.g. Mario Browser Clone"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-850 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                  required
                />
              </div>

              {/* Categories & Gradient Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">Category *</label>
                  <select
                    id="select-game-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 border border-slate-850 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">Creator Credits</label>
                  <input
                    id="input-game-credits"
                    type="text"
                    placeholder="e.g. Nintendo or Open Source"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 border border-slate-850 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Description Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">Short Description *</label>
                <textarea
                  id="input-game-desc"
                  placeholder="Summarize the game gameplay and storyline in 1-2 lines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-850 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                  required
                />
              </div>

              {/* Iframe URL Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">Iframe URL / Embed Link *</label>
                <input
                  id="input-game-url"
                  type="url"
                  placeholder="https://example.com/game/"
                  value={iframeUrl}
                  onChange={(e) => setIframeUrl(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-850 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                  required
                />
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 leading-relaxed">
                  Make sure the external site is frameable (allows iframe embedding). Standard sites hosted on Github Pages (`*.github.io`) are highly unblocked and free of strict security headers!
                </span>
              </div>

              {/* Instructions Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">How to Play Controls</label>
                <textarea
                  id="input-game-instructions"
                  placeholder="e.g. WASD keys to move, Space to shoot, Enter to Pause"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 text-slate-100 border border-slate-850 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                />
              </div>

              {/* Warning/Tips info footer */}
              <div className="flex gap-2.5 bg-yellow-950/20 border border-yellow-500/10 rounded-xl p-3 text-[11px] text-yellow-300 font-sans">
                <Info className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                <p>
                  Unblocked games are stored purely inside your web browser's local cache. Clearing browser history site data may delete any custom added games.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-5 mt-2 font-sans">
                <button
                  id="form-cancel-btn"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-750 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="form-submit-btn"
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-900/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  Save to Arcade
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
