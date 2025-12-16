# ME - Your Mental Health Companion 💜

A beautiful, AI-powered mental health companion app featuring a 3D avatar, voice responses, and calming ambient sounds.

![ME App](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop)

## ✨ Features

- **AI Companion (Aiko)** - Empathetic AI trained in evidence-based therapeutic techniques
- **3D Avatar** - Animated Three.js avatar that responds to conversation
- **Voice Responses** - Natural text-to-speech powered by ElevenLabs
- **Ambient Sounds** - Calming meditation background music
- **Beautiful UI** - Stunning welcome screen with aurora effects, glowing elements
- **Fully Responsive** - Works on desktop, tablet, and mobile devices

## 🚀 Live Demo

Visit: [Your Netlify URL here]

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **3D Graphics**: Three.js
- **AI**: Google Gemini API
- **Voice**: ElevenLabs TTS
- **Hosting**: Netlify with Serverless Functions

## 📦 Local Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/shakhawathossain07/ME-Your-Mental-Health-Companion.git
   cd ME-Your-Mental-Health-Companion
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Add your API keys to `.env`:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open http://localhost:3001

## 🌐 Netlify Deployment

### One-Click Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/shakhawathossain07/ME-Your-Mental-Health-Companion)

### Manual Deployment

1. Push your code to GitHub (API keys are already excluded via .gitignore)

2. Connect your repo to Netlify:
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repo

3. Configure environment variables in Netlify:
   - Go to Site Settings → Environment Variables
   - Add:
     - `GEMINI_API_KEY` - Your Google Gemini API key
     - `ELEVENLABS_API_KEY` - Your ElevenLabs API key
     - `GEMINI_MODEL` - (optional) Default: `gemini-2.5-flash`

4. Deploy! Netlify will automatically:
   - Serve static files
   - Deploy serverless functions for API endpoints

## 🔑 Getting API Keys

### Gemini API
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy and add to environment variables

### ElevenLabs API
1. Visit [ElevenLabs](https://elevenlabs.io)
2. Sign up for a free account
3. Go to Profile Settings → API Keys
4. Generate and copy your API key

## 📁 Project Structure

```
ME-Your-Mental-Health-Companion/
├── netlify/
│   └── functions/        # Serverless API functions
│       ├── gemini.js     # Gemini AI proxy
│       ├── tts.js        # ElevenLabs TTS proxy
│       └── health.js     # Health check endpoint
├── tests/                # Test files
├── app.js                # Main application logic
├── avatar3d.js           # Three.js 3D avatar
├── index.html            # Main HTML file
├── styles.css            # All styles
├── server.js             # Local development server
├── netlify.toml          # Netlify configuration
├── package.json          # Dependencies
└── .env.example          # Environment template
```

## 🔒 Security

- API keys are stored securely in environment variables
- Keys are never exposed to the client
- All API calls go through serverless functions
- `.env` file is excluded from git

## 🧪 Testing

```bash
npm test
```

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 💜 Made with Love

Created to help people find peace and support in their mental health journey.

---

**Note**: This app is not a replacement for professional mental health care. If you're in crisis, please contact a mental health professional or crisis helpline.
