# SkillGod

The ultimate AI agent skill discovery and synthesis engine. SkillGod helps you find, analyze, and combine AI agent skills from various registries into production-ready definitions for platforms like OpenClaw, Claude, and Antigravity.

## Features

- **Skill Discovery**: Search across multiple registries (ClawHub, skills.sh, GitHub) for agent capabilities.
- **Multi-Provider Support**: Use Google Gemini, OpenAI, Anthropic, OpenRouter, or local models via Ollama.
- **Skill Synthesis**: Combine multiple skills into a single, comprehensive "super-skill".
- **Platform Optimized**: Generates definitions tailored for specific agent platforms.
- **Full-Stack Proxy**: Built-in server-side proxy to handle third-party API communication securely.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/skillgod.git
   cd skillgod
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your API keys (e.g., `GEMINI_API_KEY`)

### Development

Run the development server (Express + Vite):

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Troubleshooting Local Setup

If `npm run dev` fails:

1. **Ensure dependencies are installed**: Run `npm install` before starting.
2. **Check Port 3000**: Make sure no other service is using port 3000.
3. **Node Version**: Ensure you are using Node.js v18 or higher.
4. **Browser Access**: Always access the app via `http://localhost:3000`, not `http://localhost:5173`.
5. **API Keys**: Enter your API keys in the in-app settings menu (gear icon) to enable AI features.

### Production Deployment

1. Build the frontend:

   ```bash
   npm run build
   ```

2. Start the production server:

   ```bash
   npm start
   ```

## Author

[Bhagesh Hunakunti](https://www.linkedin.com/in/bhagesh-hunakunti/)
