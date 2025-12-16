# ME APP - Your Mental Health Companion 💜

A beautiful, AI-powered mental health companion app featuring a 3D avatar, voice responses, and calming ambient sounds.

<img width="959" height="411" alt="image" src="https://github.com/user-attachments/assets/153f9af2-4ab6-419f-9b08-b6077e072037" />

## ✨ Features

- **AI Companion (Aiko)** - Empathetic AI trained in evidence-based therapeutic techniques
- **3D Avatar** - Animated Three.js avatar that responds to conversation
- **Voice Responses** - Natural text-to-speech powered by ElevenLabs
- **Ambient Sounds** - Calming meditation background music
- **Beautiful UI** - Stunning welcome screen with aurora effects, glowing elements
- **Fully Responsive** - Works on desktop, tablet, and mobile devices

## 🚀 Live Demo

Visit: https://meappyourmentalhealthcompanion.netlify.app/

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
