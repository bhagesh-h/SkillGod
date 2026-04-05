# SkillGod

The ultimate AI agent skill discovery and synthesis engine. SkillGod helps you find, analyze, and combine AI agent skills from various registries into production-ready definitions for platforms like OpenClaw, Claude, and Antigravity.

## Features

- **Skill Discovery & Web Crawling**: Search across registries (ClawHub, skills.sh, GitHub) and seamlessly scrape web documentation via Firecrawl for agent capabilities. You can optionally include custom reference URLs for precision discovery.
- **Multi-Provider AI Support**: Robust integration with Google Gemini, OpenAI, Anthropic, OpenRouter, and HuggingFace. Enjoy completely localized, privacy-focused workflows with Ollama. Adjust models specifically for rapid search (discovery) or intensive structuring (synthesis).
- **Advanced Skill Synthesis**: Combine multiple heterogeneous skills into a cohesive, production-ready "super-skill", utilizing dynamic rendering to reflect structuring phases like analyzing and compiling.
- **Platform Optimized Exports**: Generates and formats definitions precisely customized for target agent platforms, including OpenClaw (`SKILL.md`), Claude (`skill.json`), Antigravity (`manifest.json`), or entirely Custom Platforms with adherence to custom templating.
- **Full-Stack Proxy Backend**: A built-in, lightweight Express server handles third-party API communication securely, bypassing complex CORS issues while ensuring your API keys remain safe and local.
- **Beautiful & Responsive UI/UX**: Built with React, Tailwind CSS, & Motion, supporting dark and light themes, seamless transitions, intuitive tab routing, and an interactive markdown viewer for skill exploration. Download results instantly packaged in `.zip` files.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/bhagesh-h/skillgod.git
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
