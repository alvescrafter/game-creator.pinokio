# 🎮 Game Creator — How to Use Guide

Game Creator is a **Prompt Orchestrator** that helps you design and generate complete, playable games using AI. You configure game parameters through an intuitive sidebar, and the app assembles a detailed prompt that's sent to your chosen AI model to generate a fully playable HTML5 game.

---

## 🚀 Quick Start

### 1. Set Up Your API Key
Before generating anything, you need to connect an AI provider:

1. Click the **⚙️ Settings** button in the top-right header (or press `Ctrl + ,`)
2. Choose a provider:
   - **🟢 OpenAI** — GPT-4o, GPT-4, GPT-3.5 Turbo, etc.
   - **🔵 Gemini** — Google's Gemini models via OpenAI-compatible endpoint
   - **🟠 Claude** — Anthropic's Claude models via OpenAI-compatible endpoint
   - **🦙 Ollama** — Run local LLMs (no API key needed!)
   - **🟣 LM Studio** — Another local LLM option (no API key needed!)
3. Enter your **API Key** (not needed for Ollama/LM Studio)
4. Select a **Model** from the quick-select dropdown or type a custom one
5. Adjust **Temperature** if desired (higher = more creative, lower = more precise)
6. Click **Save**

### 2. Configure Your Game
Use the **left sidebar** to define your game across 5 modules:

| Module | What It Controls |
|--------|-----------------|
| 🎯 **Core Identity** | Genre, setting/theme, and tone (dark ↔ bright) |
| ⚙️ **Mechanics & Gameplay** | Game mechanics (tags), specific rules, difficulty curve |
| 🎨 **Visual & Aesthetic** | Art style, color palette, visual effects |
| �️ **Game Menu & Controls** | Menu type, menu options, HUD elements, game actions, game over screen, ESC behavior |
| 🔊 **Audio & Soundscape** | Music mood, sound effects |

> **Tip:** Each module has a **toggle switch** — turn off any module you don't want included in the prompt.

### 3. Generate Your Game
- Click the **⚡ Generate Game** button in the header (or press `Ctrl + Enter`)
- The app assembles your configuration into a detailed prompt and sends it to the AI
- Once generated, the game appears in the **🎮 Game Sandbox** tab on the right
- The assembled prompt is visible in the **📝 Prompt Preview** tab

### 4. Refine Your Game
After generating, use the **Refine bar** at the bottom of the sandbox:
- Type a change request like *"Make the player move faster"* or *"Add a score counter"*
- Click **🔄 Refine** or press `Enter`
- The AI will regenerate the game with your changes applied

---

## 📋 Sidebar Modules — Detailed

### 🎯 Core Identity
| Field | Description |
|-------|-------------|
| **Genre** | Select from 10 genres: Platformer, RPG, Puzzle, Shooter, Idle, Racing, Strategy, Roguelike, Simulation, Visual Novel |
| **Setting / Theme** | Free text — describe your world (e.g. "Cyberpunk Neon City", "Medieval Forest") |
| **Tone** | Slider from 🌑 Dark/Gritty (0) to Bright/Whimsical (100) |

### ⚙️ Mechanics & Gameplay
| Field | Description |
|-------|-------------|
| **Mechanics** | Click-to-toggle tags: Double Jump, Inventory System, Health Bar, Gravity, Permadeath, Leveling Up, Crafting, Stealth, Procedural Generation, Physics, Dialogue System, Collectibles |
| **Specific Rules** | Free text — custom rules (e.g. "The player loses a life every 30 seconds") |
| **Difficulty Curve** | Linear, Exponential, Random, or S-Curve |

### 🎨 Visual & Aesthetic
| Field | Description |
|-------|-------------|
| **Art Style** | Pixel Art, Minimalist Vector, ASCII, Low-Poly 3D, Hand-drawn, Flat Design, Retro CRT, Neon Glow |
| **Color Palette** | Pick Primary, Secondary, and Background colors |
| **Visual Effects** | Free text — describe VFX (e.g. "Screen shake on impact", "Particle explosions") |

### 🕹️ Game Menu & Controls
| Field | Description |
|-------|-------------|
| **Menu Type** | Title Screen + Pause Menu, Title Screen Only, Minimal Overlay, No Menu |
| **Menu Options** | Click-to-toggle: Start Game, Continue, Settings, How to Play, High Scores, Credits, Quit |
| **HUD Elements** | Click-to-toggle: Score, Health Bar, Lives, Timer, Level Indicator, Minimap, Inventory Bar, Combo Counter |
| **Standard Game Actions** | Click-to-toggle: Pause/Resume (ESC), Restart Level, Save Game, Load Game, Mute/Unmute, Back to Menu |
| **Game Over Screen** | Score Summary + Retry, Simple Retry, Game Over Animation, Return to Menu |
| **ESC Key Behavior** | Pause Game + Show Menu, Pause Game Only, Back to Title Screen, Nothing (disabled) |

> **Note:** Every game is generated with mandatory structure: Title Screen, Pause Menu (ESC), and Game Over screen. The Game Menu module lets you customise these.

### 💻 Technical Stack
| Field | Description |
|-------|-------------|
| **Framework** | Vanilla JS/Canvas, Phaser.js, Three.js, Kaboom.js, PixiJS, Matter.js |
| **Single File Mode** | Toggle on/off — when on, the AI delivers everything in one HTML file |
| **Asset Handling** | Free text — how to handle assets (e.g. "Use placeholder colored rectangles") |
| **Max Tokens** | API response limit (256–32768). Higher = more complex games, but costs more |

### 🔊 Audio & Soundscape
| Field | Description |
|-------|-------------|
| **Music Mood** | Lo-fi, Orchestral, 8-bit/Chiptune, Suspenseful, Upbeat Pop, Ambient, No Music |
| **SFX Requirements** | Free text — describe sound effects (e.g. "High pitched beep for jumps") |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Generate Game |
| `Ctrl + B` | Toggle Sidebar |
| `Ctrl + H` | Open History |
| `Ctrl + T` | Open Templates |
| `Ctrl + ,` | Open API Settings |
| `Escape` | Close modals / Exit fullscreen |

---

## 🛠️ Features

### 📜 History
- Click **📜 History** to view all past generations
- **Load** any previous game to restore its configuration and preview
- **Delete** individual entries or clear all history
- Stores up to 50 entries in your browser's localStorage

### 📋 Templates
- Click **📋 Templates** to manage saved configurations
- **Save Current as Template** — saves your current sidebar settings as a reusable preset
- **Load** a template to instantly configure all modules
- Great for quickly starting new games with similar settings

### 💾 Download
- Click **💾 Download** in the sandbox toolbar to save the generated game as an `.html` file
- The file is fully self-contained and can be opened in any browser

### ⛶ Fullscreen
- Click **⛶ Fullscreen** to view the game in full-screen mode
- Press `Escape` or click the exit button to return

### 🔄 Refresh
- Click **🔄 Refresh** to reload the game in the sandbox iframe

### 📋 Copy Prompt
- In the Prompt Preview tab, click **📋 Copy** to copy the assembled prompt to your clipboard
- Useful if you want to paste it into another AI tool

---

## 🤖 Supported AI Providers

| Provider | API Key Required | Base URL |
|----------|-----------------|----------|
| **OpenAI** | ✅ Yes | `https://api.openai.com/v1` |
| **Gemini** | ✅ Yes | `https://generativelanguage.googleapis.com/v1beta/openai` |
| **Claude** | ✅ Yes | `https://api.anthropic.com/v1` |
| **Ollama** | ❌ No | `http://localhost:11434/v1` |
| **LM Studio** | ❌ No | `http://localhost:1234/v1` |

> **Local LLMs:** To use Ollama or LM Studio, make sure the server is running locally before generating.

---

## 💡 Tips & Best Practices

1. **Start simple** — Choose a genre and a few mechanics, then refine later
2. **Use Single File Mode** — Keeps everything in one HTML file for easy sharing
3. **Increase Max Tokens for complex games** — 3D games and RPGs need more tokens (8192+). The default limit is 50,000 tokens for maximum game complexity.
4. **Lower temperature for precise games** — Set to 0.3–0.5 for puzzle/logic games
5. **Higher temperature for creative games** — Set to 0.8–1.2 for wild, creative results
6. **Use the Game Menu module** — Every game gets a Title Screen, Pause Menu (ESC), and Game Over screen by default. Customise these in the 🕹️ Game Menu & Controls module.
7. **Use the Refine bar** — Instead of regenerating from scratch, refine incrementally
8. **Save templates** — If you find a configuration that works well, save it as a template
9. **Check Prompt Preview** — Review the assembled prompt before generating to make sure it captures your intent
10. **Conflict warnings** — The app will warn you about incompatible settings (e.g. Three.js + Pixel Art, or No Menu + game actions)

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Please configure API settings first" | Click ⚙️ and set up your API provider and key |
| "Generation failed: API Error 401" | Your API key is invalid or expired |
| "Generation failed: API Error 429" | Rate limited — wait a moment and try again |
| "The AI returned empty code" | Try increasing Max Tokens or simplifying your request |
| Game doesn't appear in sandbox | Check the error panel below the sandbox for details |
| Ollama connection failed | Make sure Ollama is running (`ollama serve`) |
| Sidebar is hidden | Press `Ctrl + B` or click the ☰ menu button |

---

## 📁 Project Files

| File | Purpose |
|------|---------|
| `index.html` | App layout and structure |
| `style.css` | All styling and theming |
| `app.js` | Core logic, API calls, state management |

---

*Game Creator — Built with ❤️ for game developers and AI enthusiasts*