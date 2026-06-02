/* ═══════════════════════════════════════════════
   Game Creator — Prompt Orchestrator
   app.js — Core Logic
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Storage Keys (versioned) ──
  const KEYS = {
    STATE: 'gameCreator.state.v1',
    API: 'gameCreator.api.v1',
    HISTORY: 'gameCreator.history.v1',
    TEMPLATES: 'gameCreator.templates.v1',
  };

  const MAX_HISTORY = 50;

  // ── Default State ──
  const DEFAULT_STATE = {
    coreIdentity: {
      genre: '',
      theme: '',
      tone: 50,
    },
    mechanics: {
      tags: [],
      rules: '',
      difficulty: '',
    },
    visuals: {
      artStyle: '',
      colorPrimary: '#6c5ce7',
      colorSecondary: '#00cec9',
      colorBg: '#0a0a1a',
      vfx: '',
    },
    gameMenu: {
      menuType: '',
      menuOptions: [],
      hudElements: [],
      gameActions: [],
      gameOverType: '',
      escBehavior: '',
    },
    audio: {
      musicMood: '',
      sfx: '',
    },
  };

  // ── Background Tech Stack Defaults (not shown in UI) ──
  const TECH_DEFAULTS = {
    framework: 'Vanilla JS/Canvas',
    singleFile: true,
    assetHandling: 'Use placeholder colored rectangles and simple shapes',
    maxTokens: 50000,
  };

  const DEFAULT_API = {
    baseUrl: 'https://api.openai.com/v1',
    key: '',
    model: 'gpt-4o',
    temperature: 0.7,
    provider: 'openai',
  };

  // ── Module enabled state (all on by default) ──
  const DEFAULT_MODULE_ENABLED = {
    coreIdentity: true,
    mechanics: true,
    visuals: true,
    gameMenu: true,
    audio: true,
  };

  // ── Provider Presets ──
  const PROVIDER_PRESETS = {
    openai: {
      baseUrl: 'https://api.openai.com/v1',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini', 'o3-mini'],
      defaultModel: 'gpt-4o',
      needsKey: true,
    },
    gemini: {
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      models: ['gemini-2.5-pro-preview-03-25', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      defaultModel: 'gemini-2.0-flash',
      needsKey: true,
    },
    claude: {
      baseUrl: 'https://api.anthropic.com/v1',
      models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
      defaultModel: 'claude-sonnet-4-20250514',
      needsKey: true,
    },
    ollama: {
      baseUrl: 'http://localhost:11434/v1',
      models: ['llama3.2', 'llama3.1', 'llama3', 'mistral', 'codellama', 'gemma2', 'phi3', 'qwen2', 'deepseek-coder-v2', 'mixtral'],
      defaultModel: 'llama3.2',
      needsKey: false,
    },
    lmstudio: {
      baseUrl: 'http://localhost:1234/v1',
      models: [], // Populated dynamically from server
      defaultModel: '',
      needsKey: false,
    },
    custom: {
      baseUrl: '',
      models: [],
      defaultModel: '',
      needsKey: true,
    },
  };

  // ── App State ──
  let state = deepClone(DEFAULT_STATE);
  let apiSettings = deepClone(DEFAULT_API);
  let moduleEnabled = deepClone(DEFAULT_MODULE_ENABLED);
  let conversationHistory = []; // for refine feature
  let lastGeneratedCode = '';
  let isGenerating = false;
  let promptLocked = true; // prompt is locked by default
  let customPromptText = ''; // stores manually edited prompt when unlocked

  // ═══════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function uid() {
    try { return crypto.randomUUID(); }
    catch { return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  }

  function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  function getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  function formatTimestamp(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ═══════════════════════════════════════════════
  // PERSISTENCE (localStorage)
  // ═══════════════════════════════════════════════

  function saveState() {
    try {
      localStorage.setItem(KEYS.STATE, JSON.stringify({ state, moduleEnabled }));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(KEYS.STATE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.state) state = { ...deepClone(DEFAULT_STATE), ...parsed.state };
        if (parsed.moduleEnabled) moduleEnabled = { ...deepClone(DEFAULT_MODULE_ENABLED), ...parsed.moduleEnabled };
      }
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
  }

  function saveApiSettings() {
    try {
      localStorage.setItem(KEYS.API, JSON.stringify(apiSettings));
    } catch (e) {
      console.warn('Failed to save API settings:', e);
    }
  }

  function loadApiSettings() {
    try {
      const raw = localStorage.getItem(KEYS.API);
      if (raw) {
        apiSettings = { ...deepClone(DEFAULT_API), ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('Failed to load API settings:', e);
    }
  }

  function readHistory() {
    try { return JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'); }
    catch { return []; }
  }

  function writeHistory(list) {
    // Prune to MAX_HISTORY
    if (list.length > MAX_HISTORY) list = list.slice(0, MAX_HISTORY);
    try { localStorage.setItem(KEYS.HISTORY, JSON.stringify(list)); }
    catch (e) { console.warn('Failed to save history:', e); }
  }

  function readTemplates() {
    try { return JSON.parse(localStorage.getItem(KEYS.TEMPLATES) || '[]'); }
    catch { return []; }
  }

  function writeTemplates(list) {
    try { localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(list)); }
    catch (e) { console.warn('Failed to save templates:', e); }
  }

  // ═══════════════════════════════════════════════
  // TOAST NOTIFICATIONS
  // ═══════════════════════════════════════════════

  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ═══════════════════════════════════════════════
  // LOADING OVERLAY
  // ═══════════════════════════════════════════════

  function showLoading(text = 'Generating your game...') {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').classList.remove('hidden');
  }

  function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
  }

  // ═══════════════════════════════════════════════
  // PROMPT ASSEMBLER
  // ═══════════════════════════════════════════════

  function assemblePrompt() {
    const parts = [];
    const enabled = {};

    // Check which modules are enabled
    document.querySelectorAll('.module-toggle').forEach(cb => {
      enabled[cb.dataset.moduleKey] = cb.checked;
    });

    // ── System Prompt ──
    let systemPrompt = 'You are an expert Game Developer';

    // Always include tech stack context in background
    systemPrompt += ` proficient in ${TECH_DEFAULTS.framework}`;
    systemPrompt += '.';

    // Always use single file mode
    systemPrompt += '\n\nIMPORTANT: Deliver the ENTIRE game in a SINGLE HTML file including all CSS and JavaScript. Ensure all logic is contained within the file. Do NOT split into separate files.';

    // Token limit constraint
    systemPrompt += '\n\nCRITICAL: The entire game code MUST be below 50,000 tokens. Keep the code concise and efficient while maintaining full functionality.';

    // Always include framework instruction
    systemPrompt += `\n\nUse ${TECH_DEFAULTS.framework} for rendering and game logic.`;

    // Mandatory game structure
    systemPrompt += '\n\nMANDATORY GAME STRUCTURE: Every game you generate MUST include:';
    systemPrompt += '\n1. A Title Screen / Main Menu that appears first when the game loads.';
    systemPrompt += '\n2. The Title Screen must show the game title and have clearly styled, clickable buttons (at minimum "Start Game").';
    systemPrompt += '\n3. Pressing ESC during gameplay MUST pause the game and show a Pause Menu (unless the user specifies ESC should do nothing).';
    systemPrompt += '\n4. The Pause Menu must include "Resume" and "Back to Menu" buttons.';
    systemPrompt += '\n5. A Game Over screen with the final score and a "Play Again" / "Retry" button.';
    systemPrompt += '\n6. All navigation between game states (Title Screen → Gameplay → Pause → Game Over) must be seamless with no page reloads.';
    systemPrompt += '\n7. Use a state machine or game state variable to manage transitions between: TITLE, PLAYING, PAUSED, GAME_OVER.';
    systemPrompt += '\n8. All menu buttons must be consistently styled, clearly visible, and have hover effects.';

    // ── User Prompt: Game Concept ──
    let userPrompt = '';

    if (enabled.coreIdentity) {
      userPrompt += '**Game Concept:**\n';
      if (state.coreIdentity.genre) userPrompt += `- Genre: ${state.coreIdentity.genre}\n`;
      if (state.coreIdentity.theme) userPrompt += `- Setting/Theme: ${state.coreIdentity.theme}\n`;
      const toneLabel = state.coreIdentity.tone <= 20 ? 'Very Dark/Gritty'
        : state.coreIdentity.tone <= 40 ? 'Dark'
        : state.coreIdentity.tone <= 60 ? 'Balanced'
        : state.coreIdentity.tone <= 80 ? 'Bright' : 'Very Bright/Whimsical';
      userPrompt += `- Tone: ${toneLabel}\n`;
      userPrompt += '\n';
    }

    if (enabled.mechanics) {
      userPrompt += '**Gameplay Mechanics:**\n';
      if (state.mechanics.tags.length > 0) {
        userPrompt += `- Mechanics: ${state.mechanics.tags.join(', ')}\n`;
      }
      if (state.mechanics.rules) {
        userPrompt += `- Specific Rules: ${state.mechanics.rules}\n`;
      }
      if (state.mechanics.difficulty) {
        userPrompt += `- Difficulty Curve: ${state.mechanics.difficulty}\n`;
      }
      userPrompt += '\n';
    }

    if (enabled.visuals) {
      userPrompt += '**Visual Requirements:**\n';
      if (state.visuals.artStyle) userPrompt += `- Art Style: ${state.visuals.artStyle}\n`;
      userPrompt += `- Color Palette: Primary ${state.visuals.colorPrimary}, Secondary ${state.visuals.colorSecondary}, Background ${state.visuals.colorBg}\n`;
      if (state.visuals.vfx) userPrompt += `- Visual Effects: ${state.visuals.vfx}\n`;
      userPrompt += '\n';
    }

    if (enabled.gameMenu) {
      userPrompt += '**Game Menu & Controls:**\n';
      if (state.gameMenu.menuType) userPrompt += `- Menu Type: ${state.gameMenu.menuType}\n`;
      if (state.gameMenu.menuOptions.length > 0) {
        userPrompt += `- Menu Options: ${state.gameMenu.menuOptions.join(', ')}\n`;
      }
      if (state.gameMenu.hudElements.length > 0) {
        userPrompt += `- HUD Elements: ${state.gameMenu.hudElements.join(', ')}\n`;
      }
      if (state.gameMenu.gameActions.length > 0) {
        userPrompt += `- Standard Game Actions: ${state.gameMenu.gameActions.join(', ')}\n`;
      }
      if (state.gameMenu.gameOverType) userPrompt += `- Game Over Screen: ${state.gameMenu.gameOverType}\n`;
      if (state.gameMenu.escBehavior) userPrompt += `- ESC Key Behavior: ${state.gameMenu.escBehavior}\n`;
      userPrompt += '\n';
    }

    // Tech stack is always included in background
    userPrompt += '**Technical Instructions:**\n';
    userPrompt += `- Framework: ${TECH_DEFAULTS.framework}\n`;
    userPrompt += `- Single File: Yes\n`;
    userPrompt += `- Asset Handling: ${TECH_DEFAULTS.assetHandling}\n`;
    userPrompt += '\n';

    if (enabled.audio) {
      userPrompt += '**Audio & Soundscape:**\n';
      if (state.audio.musicMood) userPrompt += `- Music Mood: ${state.audio.musicMood}\n`;
      if (state.audio.sfx) userPrompt += `- SFX Requirements: ${state.audio.sfx}\n`;
      userPrompt += '\n';
    }

    userPrompt += '**Output Requirements:**\n';
    userPrompt += '- Generate a complete, playable game based on the above specifications.\n';
    userPrompt += '- Include all necessary HTML, CSS, and JavaScript in a SINGLE self-contained HTML file.\n';
    userPrompt += '- Make the game immediately playable with no additional setup.\n';
    userPrompt += '- Add clear visual feedback for all player actions.\n';
    userPrompt += '- Include a HUD showing score/health/lives/timer as applicable.\n';
    userPrompt += '\n';
    userPrompt += '**MANDATORY Game Structure Requirements:**\n';
    userPrompt += '- The game MUST have a Title Screen / Main Menu that appears first when the game loads.\n';
    userPrompt += '- The Title Screen MUST include at minimum: the game title, a "Start Game" button, and any other menu options specified above.\n';
    userPrompt += '- Pressing ESC during gameplay MUST pause the game and show a Pause Menu (unless ESC behavior is set to "Nothing").\n';
    userPrompt += '- The Pause Menu MUST include a "Resume" button and a "Back to Menu" button that returns to the Title Screen.\n';
    userPrompt += '- The game MUST have a Game Over screen with the final score and a "Play Again" or "Retry" button.\n';
    userPrompt += '- All buttons in menus MUST be clearly styled, hoverable, and clickable — use consistent button styling throughout.\n';
    userPrompt += '- Navigation between game states (Title Screen → Gameplay → Pause → Game Over) MUST be seamless with no page reloads.\n';
    userPrompt += '- Use a state machine or game state variable to manage transitions between: TITLE, PLAYING, PAUSED, GAME_OVER.\n';
    userPrompt += '- The entire game code MUST be under 50,000 tokens. Keep the code concise and efficient while maintaining full functionality.\n';

    return { systemPrompt, userPrompt };
  }

  function getFullPromptText() {
    // If prompt is unlocked and has custom text, use that
    if (!promptLocked && customPromptText) {
      return customPromptText;
    }
    const { systemPrompt, userPrompt } = assemblePrompt();
    return `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER PROMPT ===\n${userPrompt}`;
  }

  // Returns { systemPrompt, userPrompt } for generation,
  // respecting custom edits when prompt is unlocked
  function getPromptForGeneration() {
    if (!promptLocked && customPromptText) {
      // Parse custom text back into system/user sections
      const sysMatch = customPromptText.match(/=== SYSTEM PROMPT ===\n([\s\S]*?)\n=== USER PROMPT ===/);
      const userMatch = customPromptText.match(/=== USER PROMPT ===\n([\s\S]*)/);
      return {
        systemPrompt: sysMatch ? sysMatch[1].trim() : 'You are an expert Game Developer.',
        userPrompt: userMatch ? userMatch[1].trim() : customPromptText,
      };
    }
    return assemblePrompt();
  }

  // ═══════════════════════════════════════════════
  // CONFLICT VALIDATION
  // ═══════════════════════════════════════════════

  function checkConflicts() {
    const conflicts = [];

    // Permadeath + Idle (unusual combo)
    if (state.mechanics.tags.includes('Permadeath') && state.coreIdentity.genre === 'Idle') {
      conflicts.push('Permadeath in an Idle game can be frustrating. Consider removing one or the other.');
    }

    // No menu type selected but game actions selected
    if (state.gameMenu.menuType === 'No Menu' && state.gameMenu.gameActions.length > 0) {
      conflicts.push('You selected "No Menu" but also chose game actions. These actions need a menu to appear in.');
    }

    // ESC set to "Nothing" but Pause/Resume selected
    if (state.gameMenu.escBehavior === 'Nothing' && state.gameMenu.gameActions.includes('Pause/Resume (ESC)')) {
      conflicts.push('ESC is set to "Nothing" but "Pause/Resume (ESC)" is selected as a game action. These conflict.');
    }

    return conflicts;
  }

  function displayConflicts() {
    // Remove existing warnings
    document.querySelectorAll('.conflict-warning').forEach(el => el.remove());

    const conflicts = checkConflicts();
    if (conflicts.length === 0) return;

    const sidebar = document.getElementById('sidebar');
    conflicts.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'conflict-warning';
      div.textContent = msg;
      sidebar.insertBefore(div, sidebar.firstChild);
    });
  }

  // ═══════════════════════════════════════════════
  // API CLIENT
  // ═══════════════════════════════════════════════

  async function callLLM(messages) {
    const baseUrl = apiSettings.baseUrl.replace(/\/+$/, ''); // trim trailing slash
    const provider = apiSettings.provider || detectProviderFromUrl(baseUrl);
    const endpoint = `${baseUrl}/chat/completions`;

    const headers = {
      'Content-Type': 'application/json',
    };

    // Provider-specific auth headers
    if (provider === 'claude') {
      // Anthropic requires x-api-key header and anthropic-version
      headers['x-api-key'] = apiSettings.key;
      headers['anthropic-version'] = '2023-06-01';
    } else if (apiSettings.key) {
      headers['Authorization'] = `Bearer ${apiSettings.key}`;
    }

    const maxTokens = TECH_DEFAULTS.maxTokens;

    // Build request body — Claude uses a different format
    let body;
    if (provider === 'claude') {
      // Anthropic Messages API format
      const systemMsg = messages.find(m => m.role === 'system');
      const userMessages = messages.filter(m => m.role !== 'system');
      body = {
        model: apiSettings.model,
        messages: userMessages,
        max_tokens: maxTokens,
        temperature: parseFloat(apiSettings.temperature) || 0.7,
      };
      if (systemMsg) body.system = systemMsg.content;
    } else {
      // OpenAI-compatible format (OpenAI, Gemini, Ollama, LM Studio)
      body = {
        model: apiSettings.model,
        messages,
        temperature: parseFloat(apiSettings.temperature) || 0.7,
        max_tokens: maxTokens,
      };
    }

    // Claude uses a different endpoint
    const finalEndpoint = provider === 'claude'
      ? `${baseUrl}/messages`
      : endpoint;

    const res = await fetch(finalEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`API Error ${res.status}: ${errText}`);
    }

    const data = await res.json();

    // Parse response based on provider
    if (provider === 'claude') {
      const content = data.content?.[0]?.text;
      if (!content) throw new Error('API returned empty response');
      return content;
    } else {
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('API returned empty response');
      return content;
    }
  }

  // ── Detect provider from base URL ──
  function detectProviderFromUrl(url) {
    const lower = url.toLowerCase();
    if (lower.includes('anthropic') || lower.includes('claude')) return 'claude';
    if (lower.includes('generativelanguage') || lower.includes('gemini')) return 'gemini';
    if (lower.includes('localhost:11434') || lower.includes('ollama')) return 'ollama';
    if (lower.includes('localhost:1234') || lower.includes('lmstudio')) return 'lmstudio';
    if (lower.includes('openai')) return 'openai';
    return 'custom'; // default to custom for unknown URLs
  }

  // ═══════════════════════════════════════════════
  // TEST API CONNECTION
  // ═══════════════════════════════════════════════

  async function testApiConnection() {
    const statusEl = document.getElementById('connection-status');
    const btn = document.getElementById('btn-test-connection');
    const baseUrl = document.getElementById('apiBaseUrl').value.trim().replace(/\/+$/, '');
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('modelName').value.trim();
    const activeProviderBtn = document.querySelector('.provider-btn.active');
    const provider = activeProviderBtn ? activeProviderBtn.dataset.provider : detectProviderFromUrl(baseUrl);

    if (!baseUrl) {
      statusEl.textContent = '❌ Base URL is required';
      statusEl.className = 'connection-status error';
      return;
    }

    // Show testing state
    btn.classList.add('loading');
    btn.disabled = true;
    statusEl.textContent = '⏳ Testing connection...';
    statusEl.className = 'connection-status testing';

    try {
      // First, try to fetch models list (lightweight check)
      const modelsAvailable = await fetchModelsList(baseUrl, apiKey, provider, true);

      if (modelsAvailable.length > 0) {
        statusEl.textContent = `✅ Connected! Found ${modelsAvailable.length} model(s)`;
        statusEl.className = 'connection-status success';
      } else {
        // If no models endpoint, try a minimal chat completion
        await testMinimalCompletion(baseUrl, apiKey, model, provider);
        statusEl.textContent = '✅ Connected! API responded successfully';
        statusEl.className = 'connection-status success';
      }
    } catch (err) {
      statusEl.textContent = `❌ ${err.message}`;
      statusEl.className = 'connection-status error';
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  // ── Minimal completion test ──
  async function testMinimalCompletion(baseUrl, apiKey, model, provider) {
    const headers = { 'Content-Type': 'application/json' };
    if (provider === 'claude') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    let endpoint, body;
    if (provider === 'claude') {
      endpoint = `${baseUrl}/messages`;
      body = {
        model: model || 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      };
    } else {
      endpoint = `${baseUrl}/chat/completions`;
      body = {
        model: model || 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`API Error ${res.status}: ${errText.slice(0, 200)}`);
    }
  }

  // ═══════════════════════════════════════════════
  // AUTO-FETCH MODELS
  // ═══════════════════════════════════════════════

  async function fetchModelsList(baseUrl, apiKey, provider, silent = false) {
    const headers = {};
    if (provider === 'claude') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    let modelsEndpoint;
    if (provider === 'claude') {
      // Anthropic doesn't have a models list endpoint in the same way
      // Return preset models
      return PROVIDER_PRESETS.claude.models;
    } else if (provider === 'gemini') {
      // Gemini OpenAI-compatible endpoint supports /models
      modelsEndpoint = `${baseUrl}/models`;
    } else {
      // OpenAI, Ollama, LM Studio all support /models or /v1/models
      modelsEndpoint = `${baseUrl}/models`;
    }

    try {
      const res = await fetch(modelsEndpoint, { headers });
      if (!res.ok) {
        // If /models fails, try the provider's native endpoint
        if (provider === 'ollama') {
          // Ollama native API
          const nativeRes = await fetch(baseUrl.replace(/\/v1$/, '') + '/api/tags');
          if (nativeRes.ok) {
            const data = await nativeRes.json();
            return (data.models || []).map(m => m.name || m.model);
          }
        }
        if (provider === 'lmstudio') {
          // LM Studio native API
          const nativeRes = await fetch(baseUrl.replace(/\/v1$/, '') + '/api/v0/models');
          if (nativeRes.ok) {
            const data = await nativeRes.json();
            return (data.data || []).map(m => m.id);
          }
        }
        throw new Error(`Models endpoint returned ${res.status}`);
      }

      const data = await res.json();

      // OpenAI-compatible format: { data: [{ id: "model-name", ... }] }
      if (data.data && Array.isArray(data.data)) {
        return data.data.map(m => m.id).filter(Boolean);
      }

      // Gemini format: { models: [{ name: "models/gemini-...", ... }] }
      if (data.models && Array.isArray(data.models)) {
        return data.models.map(m => {
          // Gemini returns "models/gemini-2.0-flash" — strip the "models/" prefix
          const name = m.name || m.id || '';
          return name.replace(/^models\//, '');
        }).filter(Boolean);
      }

      return [];
    } catch (err) {
      if (!silent) throw err;
      return [];
    }
  }

  async function autoFetchModels() {
    const statusEl = document.getElementById('model-fetch-status');
    const btn = document.getElementById('btn-fetch-models');
    const baseUrl = document.getElementById('apiBaseUrl').value.trim().replace(/\/+$/, '');
    const apiKey = document.getElementById('apiKey').value.trim();
    const activeProviderBtn = document.querySelector('.provider-btn.active');
    const provider = activeProviderBtn ? activeProviderBtn.dataset.provider : detectProviderFromUrl(baseUrl);

    if (!baseUrl) {
      statusEl.textContent = '❌ Enter a Base URL first';
      statusEl.className = 'model-fetch-status error';
      return;
    }

    btn.classList.add('loading');
    btn.disabled = true;
    statusEl.textContent = '⏳ Fetching models...';
    statusEl.className = 'model-fetch-status';

    try {
      const models = await fetchModelsList(baseUrl, apiKey, provider);

      if (models.length === 0) {
        statusEl.textContent = '⚠️ No models found. Check your server is running.';
        statusEl.className = 'model-fetch-status error';
        return;
      }

      // Sort models alphabetically
      models.sort((a, b) => a.localeCompare(b));

      // Populate the model dropdown
      const modelSelect = document.getElementById('modelPreset');
      modelSelect.innerHTML = '<option value="">— Quick Select —</option>';
      models.forEach(model => {
        const opt = document.createElement('option');
        opt.value = model;
        opt.textContent = model;
        modelSelect.appendChild(opt);
      });

      // Also update the provider preset models for future use
      if (provider && PROVIDER_PRESETS[provider]) {
        PROVIDER_PRESETS[provider].models = models;
      }

      // Auto-select first model if current model is empty
      const modelNameInput = document.getElementById('modelName');
      if (!modelNameInput.value.trim() && models.length > 0) {
        modelNameInput.value = models[0];
      }

      statusEl.textContent = `✅ Found ${models.length} model(s)`;
      statusEl.className = 'model-fetch-status success';
    } catch (err) {
      statusEl.textContent = `❌ ${err.message}`;
      statusEl.className = 'model-fetch-status error';
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  // ═══════════════════════════════════════════════
  // CODE EXTRACTION
  // ═══════════════════════════════════════════════

  function extractCode(response) {
    // Try to extract from markdown code fences
    // Patterns: ```html ... ```, ```javascript ... ```, ``` ... ```
    const patterns = [
      /```html\s*\n([\s\S]*?)```/i,
      /```javascript\s*\n([\s\S]*?)```/i,
      /```js\s*\n([\s\S]*?)```/i,
      /```\s*\n([\s\S]*?)```/,
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // If no fences found, check if the response looks like HTML
    const trimmed = response.trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<head')) {
      return trimmed;
    }

    // Last resort: return the whole response
    return trimmed;
  }

  // ═══════════════════════════════════════════════
  // IFRAME RENDERING
  // ═══════════════════════════════════════════════

  function renderInIframe(code) {
    const iframe = document.getElementById('game-iframe');
    const placeholder = document.getElementById('iframe-placeholder');
    const errorPanel = document.getElementById('error-panel');

    // Hide error panel by default
    if (errorPanel) errorPanel.classList.add('hidden');

    try {
      // Use srcdoc for normal-sized code
      iframe.srcdoc = code;
      placeholder.classList.add('hidden');
      lastGeneratedCode = code;

      // Switch to sandbox tab
      switchTab('sandbox');

      // Listen for iframe errors
      iframe.onload = function() {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          // Check if the iframe content looks like it has an error (empty body or error text)
          if (iframeDoc && iframeDoc.body && iframeDoc.body.innerHTML.trim() === '') {
            // The page loaded but is empty — might still be rendering
          }
        } catch (e) {
          // Cross-origin — can't inspect, which is fine
        }
      };
    } catch (e) {
      // Fallback to Blob URL for very large code
      try {
        const blob = new Blob([code], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        iframe.src = url;
        iframe.removeAttribute('srcdoc');
        placeholder.classList.add('hidden');
        lastGeneratedCode = code;
        switchTab('sandbox');
      } catch (e2) {
        showToast('Failed to render game: ' + e2.message, 'error');
        showErrorInPanel('Failed to render game: ' + e2.message);
      }
    }
  }

  function showErrorInPanel(message) {
    const errorPanel = document.getElementById('error-panel');
    const errorText = document.getElementById('error-text');
    if (errorPanel && errorText) {
      errorText.textContent = message;
      errorPanel.classList.remove('hidden');
    }
  }

  function hideErrorPanel() {
    const errorPanel = document.getElementById('error-panel');
    if (errorPanel) errorPanel.classList.add('hidden');
  }

  // ═══════════════════════════════════════════════
  // GENERATE GAME
  // ═══════════════════════════════════════════════

  async function generateGame() {
    if (isGenerating) return;

    // Validate API settings
    if (!apiSettings.baseUrl) {
      showToast('Please configure API settings first (⚙️)', 'warning');
      openModal('modal-settings');
      return;
    }

    // Check for conflicts
    const conflicts = checkConflicts();
    if (conflicts.length > 0) {
      // Show conflicts but allow user to proceed
      displayConflicts();
    }

    isGenerating = true;
    showLoading('Generating your game...');
    hideErrorPanel();
    document.getElementById('btn-generate').disabled = true;

    try {
      const { systemPrompt, userPrompt } = getPromptForGeneration();

      // Build conversation
      conversationHistory = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await callLLM(conversationHistory);
      conversationHistory.push({ role: 'assistant', content: response });

      const code = extractCode(response);

      if (!code || code.trim().length === 0) {
        throw new Error('The AI returned empty code. Try adjusting your settings or prompt.');
      }

      renderInIframe(code);

      // Save to history
      saveToHistory(code);

      showToast('Game generated successfully! 🎮', 'success');
    } catch (err) {
      console.error('Generation failed:', err);
      showToast('Generation failed: ' + err.message, 'error', 5000);
      showErrorInPanel('Generation failed: ' + err.message);
    } finally {
      isGenerating = false;
      hideLoading();
      document.getElementById('btn-generate').disabled = false;
    }
  }

  // ═══════════════════════════════════════════════
  // REFINE FEATURE
  // ═══════════════════════════════════════════════

  async function refineGame(instruction) {
    if (isGenerating) return;
    if (!conversationHistory.length) {
      showToast('Generate a game first before refining', 'warning');
      return;
    }

    isGenerating = true;
    showLoading('Refining your game...');
    hideErrorPanel();
    document.getElementById('btn-refine').disabled = true;

    try {
      conversationHistory.push({
        role: 'user',
        content: `Refine the game with this change: ${instruction}\n\nReturn the COMPLETE updated game code. Do not omit any parts.`,
      });

      const response = await callLLM(conversationHistory);
      conversationHistory.push({ role: 'assistant', content: response });

      const code = extractCode(response);

      if (!code || code.trim().length === 0) {
        throw new Error('The AI returned empty code. Try rephrasing your refinement.');
      }

      renderInIframe(code);

      // Update history entry
      saveToHistory(code, true);

      showToast('Game refined! 🔄', 'success');
      document.getElementById('refine-input').value = '';
    } catch (err) {
      console.error('Refine failed:', err);
      showToast('Refine failed: ' + err.message, 'error', 5000);
      showErrorInPanel('Refine failed: ' + err.message);
    } finally {
      isGenerating = false;
      hideLoading();
      document.getElementById('btn-refine').disabled = false;
    }
  }

  // ═══════════════════════════════════════════════
  // HISTORY
  // ═══════════════════════════════════════════════

  function saveToHistory(code, isRefine = false) {
    const list = readHistory();
    const genre = state.coreIdentity.genre || 'Unknown';
    const theme = state.coreIdentity.theme || 'Untitled';

    const entry = {
      id: uid(),
      title: `${genre} — ${theme}`,
      genre,
      theme,
      code,
      config: deepClone(state),
      moduleEnabled: deepClone(moduleEnabled),
      timestamp: Date.now(),
      isRefine,
    };

    list.unshift(entry);
    writeHistory(list);
  }

  function renderHistory() {
    const list = readHistory();
    const container = document.getElementById('history-list');

    if (list.length === 0) {
      container.innerHTML = '<p class="placeholder">No generations yet. Create your first game!</p>';
      return;
    }

    container.innerHTML = list.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-info">
          <div class="history-title">${escapeHtml(item.title)}</div>
          <div class="history-meta">${formatTimestamp(item.timestamp)}${item.isRefine ? ' · Refined' : ''}</div>
        </div>
        <div class="history-actions">
          <button class="btn btn-sm" onclick="window.__loadHistory('${item.id}')" title="Load this game">📂 Load</button>
          <button class="btn btn-sm btn-danger" onclick="window.__deleteHistory('${item.id}')" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  function loadHistoryItem(id) {
    const list = readHistory();
    const item = list.find(h => h.id === id);
    if (!item) {
      showToast('History item not found', 'error');
      return;
    }

    // Restore config
    state = { ...deepClone(DEFAULT_STATE), ...item.config };
    moduleEnabled = { ...deepClone(DEFAULT_MODULE_ENABLED), ...item.moduleEnabled };

    // Restore code to iframe
    if (item.code) {
      renderInIframe(item.code);
    }

    // Update UI fields
    syncUIFromState();
    updatePromptPreview();
    saveState();

    closeModal('modal-history');
    showToast('Loaded: ' + item.title, 'success');
  }

  function deleteHistoryItem(id) {
    let list = readHistory();
    list = list.filter(h => h.id !== id);
    writeHistory(list);
    renderHistory();
    showToast('History item deleted', 'info');
  }

  function clearHistory() {
    if (!confirm('Delete all generation history? This cannot be undone.')) return;
    writeHistory([]);
    renderHistory();
    showToast('History cleared', 'info');
  }

  // ═══════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════

  function saveTemplate() {
    const name = prompt('Template name:');
    if (!name) return;

    const list = readTemplates();
    list.unshift({
      id: uid(),
      name,
      config: deepClone(state),
      moduleEnabled: deepClone(moduleEnabled),
      timestamp: Date.now(),
    });
    writeTemplates(list);
    renderTemplates();
    showToast('Template saved: ' + name, 'success');
  }

  function renderTemplates() {
    const list = readTemplates();
    const container = document.getElementById('template-list');

    if (list.length === 0) {
      container.innerHTML = '<p class="placeholder">No saved templates yet. Configure your modules and save!</p>';
      return;
    }

    container.innerHTML = list.map(item => `
      <div class="template-item" data-id="${item.id}">
        <div class="template-info">
          <div class="template-title">${escapeHtml(item.name)}</div>
          <div class="template-meta">${formatTimestamp(item.timestamp)}</div>
        </div>
        <div class="template-actions-bar">
          <button class="btn btn-sm" onclick="window.__loadTemplate('${item.id}')" title="Load template">📂 Load</button>
          <button class="btn btn-sm btn-danger" onclick="window.__deleteTemplate('${item.id}')" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  function loadTemplate(id) {
    const list = readTemplates();
    const item = list.find(t => t.id === id);
    if (!item) {
      showToast('Template not found', 'error');
      return;
    }

    state = { ...deepClone(DEFAULT_STATE), ...item.config };
    moduleEnabled = { ...deepClone(DEFAULT_MODULE_ENABLED), ...item.moduleEnabled };

    syncUIFromState();
    updatePromptPreview();
    saveState();

    closeModal('modal-templates');
    showToast('Template loaded: ' + item.name, 'success');
  }

  function deleteTemplate(id) {
    let list = readTemplates();
    list = list.filter(t => t.id !== id);
    writeTemplates(list);
    renderTemplates();
    showToast('Template deleted', 'info');
  }

  // ═══════════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════════

  function downloadHTML() {
    if (!lastGeneratedCode) {
      showToast('No game to download. Generate one first!', 'warning');
      return;
    }

    const blob = new Blob([lastGeneratedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const genre = state.coreIdentity.genre || 'game';
    const theme = state.coreIdentity.theme || 'untitled';
    a.download = `${genre.toLowerCase()}-${theme.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Game downloaded! 💾', 'success');
  }

  // ═══════════════════════════════════════════════
  // UI SYNC
  // ═══════════════════════════════════════════════

  function syncUIFromState() {
    // Sync all data-path fields
    document.querySelectorAll('[data-path]').forEach(el => {
      const path = el.dataset.path;
      const value = getNestedValue(state, path);
      if (value === undefined || value === null) return;

      if (el.type === 'checkbox') {
        el.checked = !!value;
      } else {
        el.value = value;
      }
    });

    // Sync module toggles
    document.querySelectorAll('.module-toggle').forEach(cb => {
      cb.checked = !!moduleEnabled[cb.dataset.moduleKey];
    });

    // Sync mechanics tags
    document.querySelectorAll('#mechanics-tags .tag-btn').forEach(btn => {
      const isActive = state.mechanics.tags.includes(btn.dataset.value);
      btn.classList.toggle('active', isActive);
    });

    // Sync game menu tags
    document.querySelectorAll('#menuOptions-tags .tag-btn').forEach(btn => {
      const isActive = (state.gameMenu.menuOptions || []).includes(btn.dataset.value);
      btn.classList.toggle('active', isActive);
    });
    document.querySelectorAll('#hudElements-tags .tag-btn').forEach(btn => {
      const isActive = (state.gameMenu.hudElements || []).includes(btn.dataset.value);
      btn.classList.toggle('active', isActive);
    });
    document.querySelectorAll('#gameActions-tags .tag-btn').forEach(btn => {
      const isActive = (state.gameMenu.gameActions || []).includes(btn.dataset.value);
      btn.classList.toggle('active', isActive);
    });

    // Update derived labels
    updateToneLabel();
    updateTempLabel();
  }

  function syncStateFromUI() {
    // Sync all data-path fields
    document.querySelectorAll('[data-path]').forEach(el => {
      const path = el.dataset.path;
      if (!path) return;

      let value;
      if (el.type === 'checkbox') {
        value = el.checked;
      } else if (el.type === 'number' || el.type === 'range') {
        value = parseFloat(el.value);
      } else if (el.type === 'color') {
        value = el.value;
      } else {
        value = el.value;
      }

      setNestedValue(state, path, value);
    });

    // Sync module toggles
    document.querySelectorAll('.module-toggle').forEach(cb => {
      moduleEnabled[cb.dataset.moduleKey] = cb.checked;
    });

    // Sync mechanics tags
    state.mechanics.tags = [];
    document.querySelectorAll('#mechanics-tags .tag-btn.active').forEach(btn => {
      state.mechanics.tags.push(btn.dataset.value);
    });

    // Sync game menu tags
    state.gameMenu.menuOptions = [];
    document.querySelectorAll('#menuOptions-tags .tag-btn.active').forEach(btn => {
      state.gameMenu.menuOptions.push(btn.dataset.value);
    });
    state.gameMenu.hudElements = [];
    document.querySelectorAll('#hudElements-tags .tag-btn.active').forEach(btn => {
      state.gameMenu.hudElements.push(btn.dataset.value);
    });
    state.gameMenu.gameActions = [];
    document.querySelectorAll('#gameActions-tags .tag-btn.active').forEach(btn => {
      state.gameMenu.gameActions.push(btn.dataset.value);
    });
  }

  function updatePromptPreview() {
    const preview = document.getElementById('prompt-preview');
    if (promptLocked) {
      // Auto-generated: always refresh from modules
      preview.textContent = getFullPromptText();
      preview.contentEditable = 'false';
    } else {
      // Unlocked: show custom text (or default if not yet edited)
      if (!customPromptText) {
        const { systemPrompt, userPrompt } = assemblePrompt();
        customPromptText = `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER PROMPT ===\n${userPrompt}`;
      }
      preview.textContent = customPromptText;
      preview.contentEditable = 'true';
    }
  }

  function updateToneLabel() {
    const val = state.coreIdentity.tone;
    const label = val <= 20 ? 'Very Dark/Gritty'
      : val <= 40 ? 'Dark'
      : val <= 60 ? 'Balanced'
      : val <= 80 ? 'Bright' : 'Very Bright/Whimsical';
    document.getElementById('tone-label').textContent = label;
  }

  function updateTempLabel() {
    const label = document.getElementById('temp-label');
    if (label) {
      label.textContent = apiSettings.temperature;
    }
  }

  // ═══════════════════════════════════════════════
  // TAB SWITCHING
  // ═══════════════════════════════════════════════

  function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${tabName}`);
    });
  }

  // ═══════════════════════════════════════════════
  // MODALS
  // ═══════════════════════════════════════════════

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal && modal.showModal) {
      modal.showModal();
    }
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal && modal.close) {
      modal.close();
    }
  }

  // ═══════════════════════════════════════════════
  // HTML ESCAPE
  // ═══════════════════════════════════════════════

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ═══════════════════════════════════════════════
  // FULLSCREEN IFRAME
  // ═══════════════════════════════════════════════

  function toggleFullscreen() {
    const container = document.getElementById('iframe-container');
    const isFs = container.classList.toggle('fullscreen');

    if (isFs) {
      // Add exit button
      const exitBtn = document.createElement('button');
      exitBtn.className = 'fullscreen-exit';
      exitBtn.textContent = '✕ Exit Fullscreen';
      exitBtn.onclick = toggleFullscreen;
      container.appendChild(exitBtn);
    } else {
      // Remove exit button
      const exitBtn = container.querySelector('.fullscreen-exit');
      if (exitBtn) exitBtn.remove();
    }
  }

  // ═══════════════════════════════════════════════
  // COPY PROMPT
  // ═══════════════════════════════════════════════

  async function copyPrompt() {
    const text = getFullPromptText();
    try {
      await navigator.clipboard.writeText(text);
      showToast('Prompt copied to clipboard! 📋', 'success');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast('Prompt copied! 📋', 'success');
    }
  }

  // ═══════════════════════════════════════════════
  // EVENT LISTENERS
  // ═══════════════════════════════════════════════

  function initEventListeners() {
    // ── Generate Button ──
    document.getElementById('btn-generate').addEventListener('click', generateGame);

    // ── Refine Button ──
    document.getElementById('btn-refine').addEventListener('click', () => {
      const input = document.getElementById('refine-input');
      if (input.value.trim()) refineGame(input.value.trim());
    });

    // ── Refine Enter Key ──
    document.getElementById('refine-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const val = e.target.value.trim();
        if (val) refineGame(val);
      }
    });

    // ── All data-path fields: auto-save on change ──
    document.querySelectorAll('[data-path]').forEach(el => {
      const eventType = (el.type === 'range' || el.type === 'color') ? 'input' : 'change';
      el.addEventListener(eventType, () => {
        syncStateFromUI();
        updatePromptPreview();
        updateToneLabel();
        saveState();
        displayConflicts();
      });
    });

    // ── Module toggles ──
    document.querySelectorAll('.module-toggle').forEach(cb => {
      cb.addEventListener('change', () => {
        moduleEnabled[cb.dataset.moduleKey] = cb.checked;
        updatePromptPreview();
        saveState();
      });
    });

    // ── Mechanics tags ──
    document.querySelectorAll('#mechanics-tags .tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        syncStateFromUI();
        updatePromptPreview();
        saveState();
      });
    });

    // ── Game Menu: Menu Options tags ──
    document.querySelectorAll('#menuOptions-tags .tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        syncStateFromUI();
        updatePromptPreview();
        saveState();
      });
    });

    // ── Game Menu: HUD Elements tags ──
    document.querySelectorAll('#hudElements-tags .tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        syncStateFromUI();
        updatePromptPreview();
        saveState();
      });
    });

    // ── Game Menu: Game Actions tags ──
    document.querySelectorAll('#gameActions-tags .tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        syncStateFromUI();
        updatePromptPreview();
        saveState();
      });
    });

    // ── Tab switching ──
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // ── Sidebar toggle ──
    document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
    });

    // ── Settings modal ──
    document.getElementById('btn-settings').addEventListener('click', () => {
      // Populate settings fields from apiSettings
      document.getElementById('apiBaseUrl').value = apiSettings.baseUrl;
      document.getElementById('apiKey').value = apiSettings.key;
      document.getElementById('modelName').value = apiSettings.model;
      document.getElementById('apiTemperature').value = apiSettings.temperature;
      updateTempLabel();

      // Highlight matching provider preset
      let matchedProvider = false;
      document.querySelectorAll('.provider-btn').forEach(btn => {
        const preset = PROVIDER_PRESETS[btn.dataset.provider];
        if (preset && preset.baseUrl && apiSettings.baseUrl === preset.baseUrl) {
          btn.classList.add('active');
          matchedProvider = true;
          // Populate model dropdown for this provider
          const modelSelect = document.getElementById('modelPreset');
          modelSelect.innerHTML = '<option value="">— Quick Select —</option>';
          preset.models.forEach(model => {
            const opt = document.createElement('option');
            opt.value = model;
            opt.textContent = model;
            modelSelect.appendChild(opt);
          });
        } else {
          btn.classList.remove('active');
        }
      });
      // If no preset matched and there's a custom URL, highlight Custom API
      if (!matchedProvider && apiSettings.baseUrl) {
        const customBtn = document.querySelector('.provider-btn[data-provider="custom"]');
        if (customBtn) customBtn.classList.add('active');
      }

      openModal('modal-settings');
    });

    // ── Save settings on close ──
    document.getElementById('modal-settings').addEventListener('close', () => {
      apiSettings.baseUrl = document.getElementById('apiBaseUrl').value.trim();
      apiSettings.key = document.getElementById('apiKey').value.trim();
      apiSettings.model = document.getElementById('modelName').value.trim();
      apiSettings.temperature = parseFloat(document.getElementById('apiTemperature').value) || 0.7;
      // Save active provider
      const activeProvider = document.querySelector('.provider-btn.active');
      apiSettings.provider = activeProvider ? activeProvider.dataset.provider : '';
      saveApiSettings();
    });

    // ── Temperature slider live update ──
    document.getElementById('apiTemperature').addEventListener('input', (e) => {
      document.getElementById('temp-label').textContent = e.target.value;
    });

    // ── Provider preset buttons ──
    document.querySelectorAll('.provider-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const provider = btn.dataset.provider;
        const preset = PROVIDER_PRESETS[provider];
        if (!preset) return;

        // Highlight active provider
        document.querySelectorAll('.provider-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Fill in base URL (clear for custom — user enters their own)
        if (provider === 'custom') {
          document.getElementById('apiBaseUrl').value = '';
          document.getElementById('apiBaseUrl').placeholder = 'https://your-api-endpoint.com/v1';
        } else {
          document.getElementById('apiBaseUrl').value = preset.baseUrl;
        }

        // Fill in default model (clear for custom)
        if (provider === 'custom') {
          document.getElementById('modelName').value = '';
          document.getElementById('modelName').placeholder = 'Enter your model name';
        } else {
          document.getElementById('modelName').value = preset.defaultModel;
        }

        // Populate model quick-select dropdown
        const modelSelect = document.getElementById('modelPreset');
        modelSelect.innerHTML = '<option value="">— Quick Select —</option>';
        preset.models.forEach(model => {
          const opt = document.createElement('option');
          opt.value = model;
          opt.textContent = model;
          modelSelect.appendChild(opt);
        });

        // Clear API key for local providers
        if (!preset.needsKey) {
          document.getElementById('apiKey').value = '';
          document.getElementById('apiKey').placeholder = 'Not required for local LLMs';
        } else if (provider === 'custom') {
          document.getElementById('apiKey').placeholder = 'Enter your API key (if required)';
        } else {
          document.getElementById('apiKey').placeholder = 'sk-... (enter your API key)';
        }

        // Update temperature label
        updateTempLabel();

        // Clear previous status messages
        document.getElementById('connection-status').textContent = '';
        document.getElementById('connection-status').className = 'connection-status';
        document.getElementById('model-fetch-status').textContent = '';
        document.getElementById('model-fetch-status').className = 'model-fetch-status';

        // Auto-fetch models for local providers (Ollama, LM Studio)
        if (provider === 'ollama' || provider === 'lmstudio') {
          autoFetchModels();
        }
      });
    });

    // ── Model quick-select dropdown ──
    document.getElementById('modelPreset').addEventListener('change', (e) => {
      if (e.target.value) {
        document.getElementById('modelName').value = e.target.value;
      }
    });

    // ── Fetch Models button ──
    document.getElementById('btn-fetch-models').addEventListener('click', autoFetchModels);

    // ── Test Connection button ──
    document.getElementById('btn-test-connection').addEventListener('click', testApiConnection);

    // ── History modal ──
    document.getElementById('btn-history').addEventListener('click', () => {
      renderHistory();
      openModal('modal-history');
    });

    // ── Clear history ──
    document.getElementById('btn-clear-history').addEventListener('click', clearHistory);

    // ── Templates modal ──
    document.getElementById('btn-templates').addEventListener('click', () => {
      renderTemplates();
      openModal('modal-templates');
    });

    // ── Save template ──
    document.getElementById('btn-save-template').addEventListener('click', saveTemplate);

    // ── Download HTML ──
    document.getElementById('btn-download').addEventListener('click', downloadHTML);

    // ── Fullscreen ──
    document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

    // ── Refresh iframe ──
    document.getElementById('btn-refresh-iframe').addEventListener('click', () => {
      if (lastGeneratedCode) {
        renderInIframe(lastGeneratedCode);
        showToast('Game refreshed', 'info');
      }
    });

    // ── Dismiss error panel ──
    const btnDismissError = document.getElementById('btn-dismiss-error');
    if (btnDismissError) {
      btnDismissError.addEventListener('click', hideErrorPanel);
    }

    // ── Copy prompt ──
    document.getElementById('btn-copy-prompt').addEventListener('click', copyPrompt);

    // ── Lock/Unlock prompt ──
    document.getElementById('btn-lock-prompt').addEventListener('click', () => {
      const btn = document.getElementById('btn-lock-prompt');
      const preview = document.getElementById('prompt-preview');
      const warning = document.getElementById('prompt-edit-warning');
      const resetBtn = document.getElementById('btn-reset-prompt');

      if (promptLocked) {
        // Unlock: save current auto-generated text as starting point for editing
        const { systemPrompt, userPrompt } = assemblePrompt();
        customPromptText = `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER PROMPT ===\n${userPrompt}`;
        promptLocked = false;
        btn.textContent = '🔓 Unlocked';
        btn.classList.remove('locked');
        btn.classList.add('unlocked');
        preview.classList.remove('prompt-locked');
        preview.classList.add('prompt-unlocked');
        preview.contentEditable = 'true';
        preview.textContent = customPromptText;
        warning.classList.remove('hidden');
        resetBtn.disabled = false;
        showToast('Prompt unlocked — edits will affect generation results', 'warning');
      } else {
        // Lock: save current edited text and lock
        customPromptText = preview.textContent;
        promptLocked = true;
        btn.textContent = '🔒 Locked';
        btn.classList.remove('unlocked');
        btn.classList.add('locked');
        preview.classList.remove('prompt-unlocked');
        preview.classList.add('prompt-locked');
        preview.contentEditable = 'false';
        warning.classList.add('hidden');
        resetBtn.disabled = true;
        showToast('Prompt locked — using your edited version', 'info');
      }
    });

    // ── Save prompt edits on input ──
    document.getElementById('prompt-preview').addEventListener('input', () => {
      if (!promptLocked) {
        customPromptText = document.getElementById('prompt-preview').textContent;
      }
    });

    // ── Reset prompt to default ──
    document.getElementById('btn-reset-prompt').addEventListener('click', () => {
      if (promptLocked) return;
      customPromptText = '';
      const { systemPrompt, userPrompt } = assemblePrompt();
      const defaultText = `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER PROMPT ===\n${userPrompt}`;
      document.getElementById('prompt-preview').textContent = defaultText;
      customPromptText = defaultText;
      showToast('Prompt reset to auto-generated default', 'success');
    });

    // ── Modal close buttons ──
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    // ── Close modals on backdrop click ──
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.close();
      });
    });

    // ── Module scroll buttons ──
    document.querySelectorAll('.module-scroll-top').forEach(btn => {
      btn.addEventListener('click', () => {
        const body = btn.closest('.module-body');
        if (body) body.scrollBy({ top: -100, behavior: 'smooth' });
      });
    });
    document.querySelectorAll('.module-scroll-bottom').forEach(btn => {
      btn.addEventListener('click', () => {
        const body = btn.closest('.module-body');
        if (body) body.scrollBy({ top: 100, behavior: 'smooth' });
      });
    });

    // ── Keyboard shortcuts ──
    document.addEventListener('keydown', (e) => {
      // Ctrl+Enter: Generate
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        generateGame();
      }
      // Ctrl+B: Toggle sidebar
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        document.getElementById('sidebar').classList.toggle('collapsed');
      }
      // Ctrl+H: History
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        renderHistory();
        openModal('modal-history');
      }
      // Ctrl+T: Templates
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        renderTemplates();
        openModal('modal-templates');
      }
      // Ctrl+,: Settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        document.getElementById('btn-settings').click();
      }
      // Escape: Close modals or fullscreen
      if (e.key === 'Escape') {
        const fsContainer = document.getElementById('iframe-container');
        if (fsContainer.classList.contains('fullscreen')) {
          toggleFullscreen();
        }
      }
    });
  }

  // ═══════════════════════════════════════════════
  // GLOBAL EXPOSES (for inline onclick in history/templates)
  // ═══════════════════════════════════════════════

  window.__loadHistory = loadHistoryItem;
  window.__deleteHistory = deleteHistoryItem;
  window.__loadTemplate = loadTemplate;
  window.__deleteTemplate = deleteTemplate;

  // ═══════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════

  function init() {
    // Load persisted state
    loadState();
    loadApiSettings();

    // Sync UI from loaded state
    syncUIFromState();

    // Build initial prompt preview
    updatePromptPreview();

    // Set up all event listeners
    initEventListeners();

    // Check for conflicts
    displayConflicts();

    console.log('🎮 Game Creator initialized');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();