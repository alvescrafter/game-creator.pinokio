# Skill: Game Generation

> Generate complete, playable HTML5 games from modular design parameters using AI.

## Description

The AI Game Creator is a browser-based prompt orchestrator that turns modular game design inputs into complete, self-contained, playable HTML5 games. Users configure game parameters through a sidebar UI, the app assembles a detailed prompt, and an AI model generates a single HTML file containing the entire game.

## Inputs

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `genre` | string (enum) | Yes | One of: Platformer, RPG, Puzzle, Shooter, Idle, Racing, Strategy, Roguelike, Simulation, Visual Novel |
| `setting_theme` | string | No | Free text describing the game world (e.g. "Cyberpunk Neon City") |
| `tone` | integer (0-100) | No | 0 = Dark/Gritty, 100 = Bright/Whimsical |
| `mechanics` | string[] | No | Toggleable mechanics: Double Jump, Inventory, Health Bar, Gravity, Permadeath, Leveling, Crafting, Stealth, Procedural Generation, Physics, Dialogue, Collectibles |
| `art_style` | string (enum) | No | Pixel Art, Minimalist Vector, ASCII, Low-Poly 3D, Hand-drawn, Flat Design, Retro CRT, Neon Glow |
| `color_primary` | string | No | Hex color for primary color |
| `color_secondary` | string | No | Hex color for secondary color |
| `color_background` | string | No | Hex color for background |
| `menu_type` | string (enum) | No | Title Screen + Pause Menu, Title Screen Only, Minimal Overlay, No Menu |
| `hud_elements` | string[] | No | Score, Health Bar, Lives, Timer, Level Indicator, Minimap, Inventory Bar, Combo Counter |
| `music_mood` | string (enum) | No | Lo-fi, Orchestral, 8-bit/Chiptune, Suspenseful, Upbeat Pop, Ambient, No Music |
| `framework` | string (enum) | No | Vanilla JS/Canvas, Phaser.js, Three.js, Kaboom.js, PixiJS, Matter.js |
| `max_tokens` | integer (256-32768) | No | API response token limit. Default: 50000 |
| `ai_provider` | string (enum) | No | OpenAI, Gemini, Claude, Ollama, LM Studio |
| `ai_model` | string | No | Specific model name (e.g. "gpt-4o") |
| `temperature` | number (0-2) | No | Generation temperature. Default: 0.7 |

## Outputs

- A complete, self-contained HTML5 game file with inline CSS and JavaScript
- Every game includes mandatory structure: Title Screen, Pause Menu (ESC), and Game Over screen
- Games can be downloaded as single `.html` files

## How to Use

1. Open https://aigamecreator.netlify.app/ in a browser
2. Click **Connect Your AI** (top-right) and configure an AI provider:
   - Enter an API key for OpenAI, Gemini, or Claude
   - Or use Ollama / LM Studio locally (no API key needed)
3. Configure game parameters in the left sidebar (5 modules: Core Identity, Mechanics, Visual, Game Menu, Audio)
4. Click **Generate Game** (or press Ctrl+Enter)
5. The game appears in the Game Sandbox tab
6. Use the Refine bar for incremental tweaks
7. Click **Download** to save the game as a `.html` file

## Refinement

After generating, you can refine the game with natural language:
- Type a change request (e.g. "Make the player move faster", "Add a score counter")
- Click **Refine** or press Enter
- The AI regenerates the game with the changes applied

## Limitations

- Requires an AI API key (OpenAI, Gemini, or Claude) or a local LLM (Ollama, LM Studio)
- Runs entirely in the browser — no backend server
- API keys are stored in localStorage and sent only to the chosen AI provider
- Generated games are single HTML files (no external assets unless specified in asset handling)
- Complex 3D games or RPGs may require higher max_tokens (8192+)
- The app does not expose a server-side API — all generation happens client-side

## Technical Details

- **Tech stack**: Vanilla HTML, CSS, JavaScript — no frameworks, no build tools
- **Architecture**: Single-page application, client-side only
- **API calls**: Browser connects directly to the AI provider
- **State**: localStorage (history up to 50 games, templates, settings)
- **Output**: Self-contained HTML file with inline CSS and JS

## See Also

- [llms.txt](https://aigamecreator.netlify.app/llms.txt) — Curated AI summary
- [openapi.json](https://aigamecreator.netlify.app/openapi.json) — OpenAPI capability description
- [AGENTS.md](https://aigamecreator.netlify.app/AGENTS.md) — Context for coding agents
- [HOW_TO_USE.md](https://aigamecreator.netlify.app/HOW_TO_USE.md) — Full user guide