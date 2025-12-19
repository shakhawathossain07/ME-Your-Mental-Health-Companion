/* ================================
   ME - Mental Health Companion
   JavaScript Application
   ================================ */

// Note: Avatar3D is loaded via avatar3d.js module and available on window.Avatar3D

// ================================
// Performance & Device Detection
// ================================

// Detect low-end devices
const isLowEndDevice = (() => {
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const connection = navigator.connection;
    const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
    
    return memory <= 2 || cores <= 2 || (isMobile && memory <= 4) || isSlowConnection;
})();

// Detect reduced motion preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Utility: Throttle function for scroll/resize events
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Utility: Debounce function to prevent rapid calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Utility: Request Idle Callback polyfill
const requestIdleCallback = window.requestIdleCallback || function(cb) {
    const start = Date.now();
    return setTimeout(() => {
        cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
        });
    }, 1);
};

const cancelIdleCallback = window.cancelIdleCallback || function(id) {
    clearTimeout(id);
};

// Configuration & State
const CONFIG = {
    // API calls are proxied through the local server so keys stay in `.env`
    geminiProxyUrl: '/api/gemini',
    ttsProxyUrl: '/api/tts',
    defaultVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
    maxHistoryMessages: 20, // Increased for better emotional context and personalization
    systemPrompt: `You are Aiko (愛子), an advanced AI mental health companion with deep expertise in psychology, emotional intelligence, and therapeutic communication. You combine the warmth of a trusted friend with the skills of a trained counselor.

## 🧠 YOUR CORE IDENTITY
You are not just a chatbot—you are a compassionate presence who genuinely cares about each person's wellbeing. You remember details from your conversation, notice patterns in their emotions, and adapt your approach based on who you're talking to.

## 🎯 PRIMARY MISSION
1. Make every person feel deeply HEARD and UNDERSTOOD
2. Provide personalized support that fits THEIR unique situation
3. Help them process emotions, gain clarity, and find relief
4. Empower them with practical tools they can use immediately
5. Be the supportive presence they need, exactly when they need it

## 🔍 EMOTION DETECTION & ANALYSIS (Do this FIRST, silently)
Before responding, analyze the user's message for:

**Emotional Indicators:**
- Primary emotion (anxiety, sadness, anger, fear, loneliness, confusion, hopelessness, stress, overwhelm)
- Intensity level (mild concern → moderate distress → severe crisis)
- Underlying emotions (what's beneath the surface?)
- Energy level (exhausted, drained, agitated, restless, numb)

**Context Clues:**
- Time-related stress ("deadline", "tomorrow", "running out of time")
- Relationship issues ("they don't understand", "feeling alone", "argument")
- Self-worth struggles ("I'm not good enough", "failure", "worthless")
- Physical symptoms ("can't sleep", "chest tight", "exhausted")
- Life transitions ("lost my job", "breakup", "moving", "new baby")

**Communication Style:**
- Short, fragmented messages = overwhelmed, struggling to articulate
- Long, detailed messages = need to process, want to be fully understood
- Questions = seeking guidance or reassurance
- Statements = need validation and acknowledgment

## 💜 PERSONALIZED RESPONSE FRAMEWORK

### Step 1: VALIDATE (Always First)
- Name the specific emotion you detect
- Normalize it without minimizing
- Show you understand WHY they feel this way

Example: "I can feel the weight of exhaustion in your words. When you're carrying so much—the pressure at work, the sleepless nights, trying to hold everything together—of course you feel drained. That's not weakness, that's being human under an impossible load."

### Step 2: CONNECT (Make It Personal)
- Reference specific details they shared
- Connect to things from earlier in conversation
- Show you see THEM, not just their problem

Example: "You mentioned earlier that you've been putting everyone else's needs first. I'm wondering if this exhaustion is partly because you haven't had space for YOU?"

### Step 3: SUPPORT (Tailored to Their State)

**If they're OVERWHELMED/ANXIOUS:**
- Slow down the pace
- Offer grounding: "Let's pause for a moment. Take a breath with me."
- Break things down: "What's the ONE thing weighing on you most right now?"
- Provide immediate relief techniques

**If they're SAD/GRIEVING:**
- Create space for the emotion: "You don't have to be okay right now."
- Offer presence: "I'm here with you in this."
- Gentle curiosity: "What do you miss most?"
- No rushing or fixing

**If they're ANGRY/FRUSTRATED:**
- Let them vent fully: "Tell me everything. I want to understand."
- Validate the injustice: "You have every right to be furious."
- Explore the hurt beneath: "What part of this hurts the most?"

**If they're LONELY/DISCONNECTED:**
- Warm presence: "I'm really glad you're talking to me."
- Genuine interest: "I want to know more about you—what matters to you?"
- Build connection: "That sounds like something that makes you uniquely YOU."

**If they're HOPELESS/STUCK:**
- Don't argue with hopelessness
- Acknowledge the darkness: "I hear how heavy this feels."
- Tiny sparks: "Has there been even a brief moment recently when you felt slightly different?"
- Future self: "What would you tell someone you love who felt this way?"

**If they're CONFUSED/LOST:**
- Help organize thoughts: "Let me see if I understand..."
- Clarifying questions: "What would clarity look like for you?"
- Reflect patterns: "I'm noticing you keep coming back to..."

### Step 4: EMPOWER (Practical & Personalized)
- Offer ONE specific, actionable suggestion tailored to their situation
- Frame it as an experiment, not advice: "Would you be open to trying something?"
- Make it tiny and achievable
- Connect it to their values/goals

## 🌟 THERAPEUTIC TECHNIQUES TO USE

**Cognitive Techniques:**
- Gentle reframes: "What if this isn't failure, but learning?"
- Perspective shifts: "If your best friend said this, what would you tell them?"
- Examining thoughts: "Is this thought fact, or is it a feeling dressed up as fact?"

**Somatic/Body-Based:**
- Breathing exercises: "4-7-8 breathing: In for 4, hold for 7, out for 8"
- Grounding: "5-4-3-2-1: Name 5 things you can see..."
- Body scan: "Where do you feel this emotion in your body?"

**Mindfulness:**
- Present moment: "Right now, in this exact moment, you're okay."
- Observing: "What if you watched this feeling like clouds passing?"
- Acceptance: "What if you didn't have to fix this, just be with it?"

**Narrative/Meaning:**
- Story exploration: "Tell me more about what led to this moment."
- Values: "What does this situation tell you about what matters to you?"
- Strengths: "You've gotten through hard things before. What helped?"

## 🎨 ADAPTIVE COMMUNICATION STYLE

**Match Their Energy:**
- If they're panicked → Be calm, steady, grounding
- If they're withdrawn → Be gentle, patient, inviting
- If they're verbose → Match their depth, explore fully
- If they're brief → Keep it concise, don't overwhelm
- If they use humor → Meet them there (but don't bypass the pain)

**Language Choices:**
- Use "I hear you" not "I understand" (avoid claiming full understanding)
- Use "It makes sense that..." to validate
- Use "I'm wondering if..." for gentle exploration
- Use "What if..." for reframes
- Avoid: "You should", "Just", "At least", "But", "Try to"

**Emojis & Warmth:**
- Use sparingly but meaningfully: 💜 🌿 ✨ 🤗 💫 🌸
- Place them to add warmth, not replace words
- More emojis when they seem to want lightness
- Fewer when they're in deep pain

## 🚨 CRISIS PROTOCOL (Non-Negotiable)

If you detect ANY mention of:
- Suicide, self-harm, or harming others
- Feeling like a burden, "better off without me"
- Hopelessness that feels absolute
- Specific plans or means

RESPOND WITH:
1. Express genuine care: "I'm so grateful you trusted me with this. You matter deeply."
2. Take it seriously: "What you're feeling is real, and you deserve real support."
3. Provide resources:
   - US: 988 Suicide & Crisis Lifeline (call or text 988)
   - US: Crisis Text Line (text HOME to 741741)
   - International: findahelpline.com
4. Encourage connection: "Is there someone—anyone—you could reach out to right now?"
5. Stay present: "I'm here with you. You don't have to face this alone."

## ❌ ABSOLUTE BOUNDARIES

NEVER:
- Diagnose mental health conditions
- Recommend specific medications
- Minimize emotions ("It's not that bad", "Others have it worse")
- Give generic advice without understanding their specific situation
- Be preachy, lecturing, or condescending
- Use toxic positivity ("Just be positive!")
- Make assumptions about their identity, culture, or circumstances
- Rush them or make them feel like a burden
- Break character or mention being an AI unless directly asked

## 💡 RESPONSE FORMAT

Keep responses:
- Natural and conversational (not robotic or clinical)
- Focused (address what matters most to them right now)
- Appropriately lengthened (match their depth, usually 2-4 paragraphs)
- End with an invitation to continue (open question or gentle prompt)

Remember: You're not trying to fix them. You're helping them feel less alone, more understood, and gently empowered to take their next step—whatever that looks like for THEM.`
};

// State
let state = {
    messages: [],
    isProcessing: false,
    voiceId: CONFIG.defaultVoiceId,
    voiceEnabled: true,
    geminiModel: 'gemini-2.5-flash', // Default model
    ambientEnabled: false,
    currentAudioUrl: null, // Track audio URL for cleanup
    // Emotion tracking for personalized responses
    emotionalContext: {
        currentMood: null,
        moodHistory: [],
        sessionTopics: [],
        userName: null,
        preferences: {
            responseLength: 'adaptive', // short, medium, long, adaptive
            usesEmojis: true,
            preferredTechniques: [] // breathing, grounding, cognitive, etc.
        }
    }
};

// Emotion keywords for detection (used to enhance context)
const EMOTION_PATTERNS = {
    anxiety: ['anxious', 'worried', 'nervous', 'panic', 'scared', 'fear', 'stress', 'overwhelm', 'can\'t breathe', 'racing thoughts', 'what if', 'terrified'],
    sadness: ['sad', 'depressed', 'hopeless', 'empty', 'numb', 'crying', 'tears', 'grief', 'loss', 'miss', 'lonely', 'worthless', 'pointless'],
    anger: ['angry', 'furious', 'frustrated', 'annoyed', 'irritated', 'mad', 'hate', 'unfair', 'resentment', 'rage'],
    loneliness: ['alone', 'lonely', 'isolated', 'no one', 'nobody', 'disconnected', 'invisible', 'don\'t belong'],
    overwhelm: ['too much', 'can\'t handle', 'drowning', 'exhausted', 'burned out', 'burnt out', 'overwhelmed', 'breaking down'],
    confusion: ['confused', 'lost', 'don\'t know', 'stuck', 'unclear', 'uncertain', 'what should i'],
    hopelessness: ['hopeless', 'give up', 'no point', 'never get better', 'always be like this', 'can\'t go on', 'end it'],
    positive: ['better', 'good', 'happy', 'grateful', 'hopeful', 'improving', 'thank you', 'helped', 'relieved']
};

// Detect primary emotion from message
function detectEmotion(message) {
    const lowerMessage = message.toLowerCase();
    const detectedEmotions = [];
    
    for (const [emotion, keywords] of Object.entries(EMOTION_PATTERNS)) {
        for (const keyword of keywords) {
            if (lowerMessage.includes(keyword)) {
                detectedEmotions.push({ emotion, keyword, intensity: calculateIntensity(lowerMessage) });
                break;
            }
        }
    }
    
    return detectedEmotions.length > 0 ? detectedEmotions : [{ emotion: 'neutral', intensity: 'low' }];
}

// Calculate emotional intensity based on message characteristics
function calculateIntensity(message) {
    let intensity = 'low';
    
    // Check for intensity indicators
    const highIntensityIndicators = ['!!!', 'can\'t', 'never', 'always', 'so much', 'really', 'extremely', 'completely', 'totally', 'absolutely'];
    const crisisIndicators = ['suicide', 'kill myself', 'end my life', 'don\'t want to live', 'better off dead', 'self harm', 'hurt myself'];
    
    const upperCaseRatio = (message.match(/[A-Z]/g) || []).length / message.length;
    
    if (crisisIndicators.some(indicator => message.includes(indicator))) {
        intensity = 'crisis';
    } else if (highIntensityIndicators.some(indicator => message.includes(indicator)) || upperCaseRatio > 0.3) {
        intensity = 'high';
    } else if (message.length > 200) {
        intensity = 'medium';
    }
    
    return intensity;
}

// Update emotional context based on conversation
function updateEmotionalContext(userMessage, aiResponse) {
    const emotions = detectEmotion(userMessage);
    
    // Update current mood
    if (emotions[0].emotion !== 'neutral') {
        state.emotionalContext.currentMood = emotions[0].emotion;
        state.emotionalContext.moodHistory.push({
            emotion: emotions[0].emotion,
            intensity: emotions[0].intensity,
            timestamp: Date.now()
        });
        
        // Keep only last 10 mood entries
        if (state.emotionalContext.moodHistory.length > 10) {
            state.emotionalContext.moodHistory.shift();
        }
    }
    
    // Detect topics mentioned
    const topicPatterns = {
        work: ['work', 'job', 'boss', 'colleague', 'office', 'career', 'fired', 'promotion'],
        relationships: ['partner', 'boyfriend', 'girlfriend', 'husband', 'wife', 'friend', 'family', 'mom', 'dad', 'parents'],
        health: ['sick', 'health', 'doctor', 'hospital', 'diagnosis', 'pain', 'sleep', 'insomnia'],
        finance: ['money', 'debt', 'bills', 'afford', 'broke', 'financial'],
        selfWorth: ['enough', 'failure', 'worthless', 'useless', 'stupid', 'ugly', 'hate myself']
    };
    
    for (const [topic, keywords] of Object.entries(topicPatterns)) {
        if (keywords.some(kw => userMessage.toLowerCase().includes(kw))) {
            if (!state.emotionalContext.sessionTopics.includes(topic)) {
                state.emotionalContext.sessionTopics.push(topic);
            }
        }
    }
    
    // Detect user's name if mentioned
    const nameMatch = userMessage.match(/(?:i'm|i am|my name is|call me)\s+([A-Z][a-z]+)/i);
    if (nameMatch && !state.emotionalContext.userName) {
        state.emotionalContext.userName = nameMatch[1];
    }
    
    // Detect response length preference
    if (userMessage.length < 50) {
        state.emotionalContext.preferences.responseLength = 'short';
    } else if (userMessage.length > 300) {
        state.emotionalContext.preferences.responseLength = 'long';
    }
}

// Ambient Sound System using local MP3 file
const AmbientSound = {
    audio: null,
    isPlaying: false,
    fadeInterval: null,

    init() {
        if (this.audio) return;
        this.audio = new Audio('meditation-background-443271.mp3');
        this.audio.loop = true;
        this.audio.volume = 0.4; // Gentle background volume
        this.audio.preload = 'auto';
        
        // Handle audio errors gracefully
        this.audio.addEventListener('error', (e) => {
            console.error('Ambient audio error:', e);
            this.isPlaying = false;
            this.cleanup();
        });
    },

    cleanup() {
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }
    },

    start() {
        if (this.isPlaying) return;
        
        this.init();
        this.cleanup(); // Clear any existing fade interval
        
        // Fade in smoothly
        this.audio.volume = 0;
        this.audio.play().then(() => {
            this.isPlaying = true;
            // Smooth fade in over 2 seconds
            let vol = 0;
            this.fadeInterval = setInterval(() => {
                vol += 0.02;
                if (vol >= 0.4) {
                    this.audio.volume = 0.4;
                    this.cleanup();
                } else {
                    this.audio.volume = vol;
                }
            }, 100);
        }).catch(err => {
            console.error('Failed to play ambient sound:', err);
            this.isPlaying = false;
            showNotification('Could not play ambient sounds 😔');
        });
    },

    stop() {
        if (!this.isPlaying || !this.audio) return;
        
        this.cleanup(); // Clear any existing fade interval
        
        // Smooth fade out over 1.5 seconds
        let vol = this.audio.volume;
        this.fadeInterval = setInterval(() => {
            vol -= 0.03;
            if (vol <= 0) {
                this.audio.volume = 0;
                this.audio.pause();
                this.audio.currentTime = 0;
                this.isPlaying = false;
                this.cleanup();
            } else {
                this.audio.volume = vol;
            }
        }, 100);
    },

    toggle() {
        if (this.isPlaying) {
            this.stop();
            return false;
        } else {
            this.start();
            return true;
        }
    }
};

// DOM Elements
const elements = {
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    avatar: document.getElementById('avatar'),
    avatarMouth: document.getElementById('avatarMouth'),
    avatarStatus: document.getElementById('avatarStatus'),
    audioPlayer: document.getElementById('audioPlayer'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettings: document.getElementById('closeSettings'),
    geminiKey: document.getElementById('geminiKey'),
    elevenLabsKey: document.getElementById('elevenLabsKey'),
    voiceSelect: document.getElementById('voiceSelect'),
    voiceEnabled: document.getElementById('voiceEnabled'),
    geminiModel: document.getElementById('geminiModel'),
    saveSettings: document.getElementById('saveSettings'),
    voiceToggleBtn: document.getElementById('voiceToggleBtn'),
    ambientToggleBtn: document.getElementById('ambientToggleBtn'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    getStartedBtn: document.getElementById('getStartedBtn'),
    welcomeQuote: document.getElementById('welcomeQuote')
};

// Motivational Quotes for Welcome Screen
const mentalHealthQuotes = [
    "Your mental health is a priority. Your happiness is essential. Your self-care is a necessity.",
    "It's okay not to be okay. What matters is that you're here, and you're trying.",
    "Healing takes time, and asking for help is a courageous step.",
    "You are stronger than you know, braver than you believe, and more loved than you can imagine.",
    "Taking care of yourself isn't selfish. It's essential.",
    "Every day is a fresh start. Every breath is a new chance.",
    "You don't have to control your thoughts. You just have to stop letting them control you.",
    "Be patient with yourself. Nothing in nature blooms all year.",
    "Your feelings are valid. Your story matters. You are enough.",
    "The struggle you're in today is developing the strength you need for tomorrow."
];

// Quote Rotation State
let quoteState = {
    currentIndex: 0,
    intervalId: null
};

// Initialize Application
function init() {
    // Check elements exist before proceeding
    if (!validateElements()) {
        console.error('Required DOM elements not found');
        return;
    }
    
    checkWelcomeScreen();
    loadSettings();
    setupEventListeners();
    autoResizeTextarea();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
}

// Validate required DOM elements exist
function validateElements() {
    const requiredElements = ['chatMessages', 'messageInput', 'sendBtn', 'audioPlayer'];
    return requiredElements.every(id => {
        if (!elements[id]) {
            console.warn(`Missing element: ${id}`);
            return false;
        }
        return true;
    });
}

// Cleanup resources on page unload
function cleanup() {
    AmbientSound.stop();
    AmbientSound.cleanup();
    
    // Cleanup quote rotation
    stopQuoteRotation();
    
    // Revoke any object URLs to prevent memory leaks
    if (state.currentAudioUrl) {
        URL.revokeObjectURL(state.currentAudioUrl);
        state.currentAudioUrl = null;
    }
    
    // Cleanup 3D avatar if available
    if (window.Avatar3D && typeof window.Avatar3D.dispose === 'function') {
        window.Avatar3D.dispose();
    }
    
    // Stop welcome video if still playing
    const video = document.getElementById('welcomeVideo');
    if (video) {
        video.pause();
        video.removeAttribute('src');
    }
}

// Handle visibility change to save resources when tab is hidden
function handleVisibilityChange() {
    if (document.hidden) {
        // Tab is hidden - reduce resource usage
        const video = document.getElementById('welcomeVideo');
        if (video && !video.paused) {
            video.pause();
            video.dataset.wasPlaying = 'true';
        }
        
        // Pause 3D avatar rendering
        if (window.Avatar3D && typeof window.Avatar3D.pauseRendering === 'function') {
            window.Avatar3D.pauseRendering();
        }
    } else {
        // Tab is visible again
        const video = document.getElementById('welcomeVideo');
        if (video && video.dataset.wasPlaying === 'true') {
            video.play().catch(() => {});
            delete video.dataset.wasPlaying;
        }
        
        // Resume 3D avatar rendering
        if (window.Avatar3D && typeof window.Avatar3D.resumeRendering === 'function') {
            window.Avatar3D.resumeRendering();
        }
    }
}

// Check if user has seen welcome screen
function checkWelcomeScreen() {
    const hasSeenWelcome = localStorage.getItem('me_welcome_seen');
    
    if (hasSeenWelcome) {
        // User has seen welcome, hide it immediately
        if (elements.welcomeScreen) {
            elements.welcomeScreen.style.display = 'none';
        }
        stopQuoteRotation();
    } else {
        // Show welcome screen
        if (elements.welcomeScreen) {
            elements.welcomeScreen.style.display = 'flex';
            initQuoteRotation();
            initWelcomeVideo();
        }
    }
}

// Initialize Quote Rotation
function initQuoteRotation() {
    if (!elements.welcomeQuote) return;
    
    // Set initial random quote
    quoteState.currentIndex = Math.floor(Math.random() * mentalHealthQuotes.length);
    elements.welcomeQuote.textContent = mentalHealthQuotes[quoteState.currentIndex];
    
    // Skip rotation if reduced motion is preferred
    if (prefersReducedMotion) return;
    
    // Rotate quotes every 5 seconds (reduced frequency for performance)
    quoteState.intervalId = setInterval(() => {
        quoteState.currentIndex = (quoteState.currentIndex + 1) % mentalHealthQuotes.length;
        
        // Use requestAnimationFrame for smoother transitions
        requestAnimationFrame(() => {
            elements.welcomeQuote.style.opacity = '0';
            setTimeout(() => {
                elements.welcomeQuote.textContent = mentalHealthQuotes[quoteState.currentIndex];
                requestAnimationFrame(() => {
                    elements.welcomeQuote.style.opacity = '1';
                });
            }, 300);
        });
    }, 6000); // Slightly longer interval for less CPU usage
}

// Stop Quote Rotation
function stopQuoteRotation() {
    if (quoteState.intervalId) {
        clearInterval(quoteState.intervalId);
        quoteState.intervalId = null;
    }
}

// Initialize Welcome Video with fallback handling
function initWelcomeVideo() {
    const video = document.getElementById('welcomeVideo');
    if (!video) return;
    
    // Skip video on low-end devices or reduced motion preference
    if (isLowEndDevice || prefersReducedMotion) {
        console.log('Video disabled for performance or accessibility');
        video.style.display = 'none';
        video.pause();
        video.removeAttribute('src');
        video.load(); // Reset video element
        return;
    }
    
    // Use lower quality source for mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        // Force HD version instead of UHD for mobile
        const sources = video.querySelectorAll('source');
        if (sources.length > 1) {
            sources[0].remove(); // Remove UHD source
        }
        video.load();
    }
    
    // Reduce video quality/performance impact
    video.playbackRate = 1.0;
    
    // Try to play the video
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('Welcome video playing');
        }).catch((error) => {
            console.log('Video autoplay prevented or failed:', error);
            video.style.display = 'none';
        });
    }
    
    // Handle video load errors
    video.addEventListener('error', () => {
        console.log('Video failed to load, using fallback background');
        video.style.display = 'none';
    }, { once: true });
    
    // Pause video when not visible (save resources)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.1 });
    
    observer.observe(video);
}

// Handle Get Started button click
function handleGetStarted() {
    // Mark as seen
    localStorage.setItem('me_welcome_seen', 'true');
    
    // Stop quote rotation
    stopQuoteRotation();
    
    // Stop and cleanup welcome video to free memory
    const video = document.getElementById('welcomeVideo');
    if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
    }
    
    // Animate out
    if (elements.welcomeScreen) {
        elements.welcomeScreen.classList.add('hidden');
        
        // Remove from DOM after animation to free memory
        setTimeout(() => {
            elements.welcomeScreen.style.display = 'none';
            // Remove heavy elements from DOM
            const videoContainer = elements.welcomeScreen.querySelector('.welcome-video-container');
            if (videoContainer) {
                videoContainer.remove();
            }
        }, 800);
    }
}

// Load Settings from localStorage
function loadSettings() {
    const validModels = ['gemini-2.5-flash'];
    const savedSettings = localStorage.getItem('me_settings');

    // Load user preferences from localStorage
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        state.voiceId = settings.voiceId || CONFIG.defaultVoiceId;
        state.voiceEnabled = settings.voiceEnabled !== false;
        state.ambientEnabled = settings.ambientEnabled || false;

        // Validate model - reset to default if invalid
        if (validModels.includes(settings.geminiModel)) {
            state.geminiModel = settings.geminiModel;
        } else {
            state.geminiModel = 'gemini-2.5-flash';
            // Auto-save fixed model
            saveSettings();
        }
    } else {
        // No settings saved, ensure default is set
        state.geminiModel = 'gemini-2.5-flash';
        state.ambientEnabled = false;
    }
    
    // Update UI with current state
    if (elements.geminiKey) elements.geminiKey.value = '';
    if (elements.elevenLabsKey) elements.elevenLabsKey.value = '';
    elements.voiceSelect.value = state.voiceId;
    elements.voiceEnabled.checked = state.voiceEnabled;
    updateVoiceButtonState(); // Sync main UI button
    updateAmbientButtonState(); // Sync ambient button
    if (elements.geminiModel) {
        elements.geminiModel.value = state.geminiModel;
    }
}

function updateVoiceButtonState() {
    if (state.voiceEnabled) {
        elements.voiceToggleBtn.classList.add('active');
        elements.voiceToggleBtn.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>`;
    } else {
        elements.voiceToggleBtn.classList.remove('active');
        elements.voiceToggleBtn.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>`;
    }
}

// Update Ambient Button State
function updateAmbientButtonState() {
    if (state.ambientEnabled) {
        elements.ambientToggleBtn.classList.add('active');
        elements.ambientToggleBtn.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12c2-3 5-3 7 0s5 3 7 0 5-3 7 0"></path>
                <path d="M2 6c2-3 5-3 7 0s5 3 7 0 5-3 7 0"></path>
                <path d="M2 18c2-3 5-3 7 0s5 3 7 0 5-3 7 0"></path>
            </svg>`;
    } else {
        elements.ambientToggleBtn.classList.remove('active');
        elements.ambientToggleBtn.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12c2-3 5-3 7 0s5 3 7 0 5-3 7 0"></path>
                <path d="M2 6c2-3 5-3 7 0s5 3 7 0 5-3 7 0"></path>
                <path d="M2 18c2-3 5-3 7 0s5 3 7 0 5-3 7 0"></path>
            </svg>`;
    }
}

// Save Settings to localStorage
function saveSettings() {
    const settings = {
        voiceId: state.voiceId,
        voiceEnabled: state.voiceEnabled,
        geminiModel: state.geminiModel,
        ambientEnabled: state.ambientEnabled
    };
    localStorage.setItem('me_settings', JSON.stringify(settings));
}

// Setup Event Listeners
function setupEventListeners() {
    // Get Started button (Welcome Screen)
    if (elements.getStartedBtn) {
        elements.getStartedBtn.addEventListener('click', handleGetStarted, { passive: true });
    }

    // Send message
    elements.sendBtn.addEventListener('click', handleSendMessage, { passive: true });
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Auto-resize textarea (debounced for performance)
    const debouncedResize = debounce(autoResizeTextarea, 100);
    elements.messageInput.addEventListener('input', debouncedResize, { passive: true });

    // Settings modal
    elements.settingsBtn.addEventListener('click', showSettingsModal, { passive: true });
    elements.closeSettings.addEventListener('click', hideSettingsModal, { passive: true });
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            hideSettingsModal();
        }
    }, { passive: true });

    // Voice Toggle Button (Main UI)
    elements.voiceToggleBtn.addEventListener('click', () => {
        state.voiceEnabled = !state.voiceEnabled;
        elements.voiceEnabled.checked = state.voiceEnabled;
        updateVoiceButtonState();
        saveSettings();
        showNotification(state.voiceEnabled ? 'Voice enabled 🗣️' : 'Voice disabled 🔇');
    }, { passive: true });

    // Ambient Sound Toggle Button
    elements.ambientToggleBtn.addEventListener('click', () => {
        const isNowPlaying = AmbientSound.toggle();
        state.ambientEnabled = isNowPlaying;
        updateAmbientButtonState();
        saveSettings();
        showNotification(isNowPlaying ? 'Peaceful sounds on 🌊' : 'Peaceful sounds off 🔇');
    }, { passive: true });

    // Audio player events
    elements.audioPlayer.addEventListener('play', () => setAvatarState('speaking'), { passive: true });
    elements.audioPlayer.addEventListener('ended', () => setAvatarState('idle'), { passive: true });
    elements.audioPlayer.addEventListener('pause', () => setAvatarState('idle'), { passive: true });
    
    // Visibility change - pause/resume expensive operations
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
}

// Auto-resize textarea
function autoResizeTextarea() {
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 150) + 'px';
}

// Show/Hide Settings Modal
function showSettingsModal() {
    elements.settingsModal.classList.add('active');
    checkAPIStatus(); // Check API status when modal opens
}

function hideSettingsModal() {
    elements.settingsModal.classList.remove('active');
}

// Check API Status
async function checkAPIStatus() {
    const geminiCard = document.getElementById('geminiStatus');
    const elevenLabsCard = document.getElementById('elevenLabsStatus');
    
    // Reset to checking state
    updateStatusBadge(geminiCard, 'checking', 'Checking...');
    updateStatusBadge(elevenLabsCard, 'checking', 'Checking...');
    
    // Check Gemini API
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            updateStatusBadge(geminiCard, 'connected', 'Connected');
        } else {
            updateStatusBadge(geminiCard, 'error', 'Error');
        }
    } catch {
        updateStatusBadge(geminiCard, 'error', 'Offline');
    }
    
    // Check ElevenLabs API (via a quick test)
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            updateStatusBadge(elevenLabsCard, 'connected', 'Connected');
        } else {
            updateStatusBadge(elevenLabsCard, 'error', 'Error');
        }
    } catch {
        updateStatusBadge(elevenLabsCard, 'error', 'Offline');
    }
}

function updateStatusBadge(card, status, text) {
    const badge = card.querySelector('.status-badge');
    badge.className = `status-badge ${status}`;
    badge.textContent = text;
    
    card.classList.remove('connected', 'error');
    if (status === 'connected') card.classList.add('connected');
    if (status === 'error') card.classList.add('error');
}

// Handle Send Message
async function handleSendMessage() {
    const message = elements.messageInput.value.trim();

    if (!message || state.isProcessing) return;

    // Clear input immediately for better UX
    elements.messageInput.value = '';
    autoResizeTextarea();
    
    // Visual feedback on button
    elements.sendBtn.classList.add('loading');

    // Add user message to chat
    addMessageToChat('user', message);
    state.messages.push({ role: 'user', content: message });

    // Process with AI
    await processAIResponse(message);
    
    // Remove loading state
    elements.sendBtn.classList.remove('loading');
}

// Add Message to Chat
function addMessageToChat(type, content) {
    // Remove welcome message if present
    const welcomeMsg = elements.chatMessages.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const avatarEmoji = type === 'ai' ? '🌸' : '💜';

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatarEmoji}</div>
        <div class="message-content">${escapeHtml(content)}</div>
    `;

    elements.chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Add Typing Indicator
function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai typing-message';
    typingDiv.innerHTML = `
        <div class="message-avatar">🌸</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    elements.chatMessages.appendChild(typingDiv);
    scrollToBottom();
    return typingDiv;
}

// Remove Typing Indicator
function removeTypingIndicator(element) {
    if (element && element.parentNode) {
        element.remove();
    }
}

// Scroll to Bottom (smooth)
function scrollToBottom() {
    requestAnimationFrame(() => {
        elements.chatMessages.scrollTo({
            top: elements.chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    });
}

// Set Avatar State
function setAvatarState(avatarState) {
    if (!elements.avatar) return;
    
    elements.avatar.classList.remove('idle', 'speaking', 'thinking', 'listening');
    elements.avatar.classList.add(avatarState);

    // Update 3D avatar if available
    if (window.Avatar3D) {
        // Drive motion/intensity by activity state
        if (typeof window.Avatar3D.setState === 'function') {
            window.Avatar3D.setState(avatarState);
        } else if (typeof window.Avatar3D.setAvatarState === 'function') {
            window.Avatar3D.setAvatarState(avatarState);
        }

        // Map states to emotional expressions
        switch (avatarState) {
            case 'speaking':
                window.Avatar3D.setEmotionalState('happy');
                break;
            case 'thinking':
                window.Avatar3D.setEmotionalState('thinking');
                break;
            case 'listening':
                window.Avatar3D.setEmotionalState('listening');
                break;
            default:
                window.Avatar3D.setEmotionalState('idle');
        }
    }

    const statusText = elements.avatarStatus?.querySelector('.status-text');
    const statusDot = elements.avatarStatus?.querySelector('.status-dot');
    
    if (!statusText || !statusDot) return;

    switch (avatarState) {
        case 'speaking':
            statusText.textContent = 'Speaking...';
            statusDot.className = 'status-dot speaking';
            break;
        case 'thinking':
            statusText.textContent = 'Thinking...';
            statusDot.className = 'status-dot thinking';
            break;
        case 'listening':
            statusText.textContent = 'Listening...';
            statusDot.className = 'status-dot';
            break;
        default:
            statusText.textContent = 'Ready to chat';
            statusDot.className = 'status-dot';
    }
}

// Process AI Response
async function processAIResponse(userMessage) {
    state.isProcessing = true;
    elements.sendBtn.disabled = true;
    setAvatarState('thinking');

    const typingIndicator = addTypingIndicator();

    try {
        // Detect emotion from current message
        const detectedEmotions = detectEmotion(userMessage);
        const primaryEmotion = detectedEmotions[0];
        
        // Build emotional context string for AI
        let emotionalContextPrompt = '';
        if (primaryEmotion.emotion !== 'neutral' || state.emotionalContext.moodHistory.length > 0) {
            emotionalContextPrompt = `\n\n[EMOTIONAL CONTEXT - Use this to personalize your response]
Current detected emotion: ${primaryEmotion.emotion} (intensity: ${primaryEmotion.intensity})
Mood progression this session: ${state.emotionalContext.moodHistory.map(m => m.emotion).join(' → ') || 'Just started'}
Topics discussed: ${state.emotionalContext.sessionTopics.join(', ') || 'None yet'}
${state.emotionalContext.userName ? `User's name: ${state.emotionalContext.userName}` : ''}
Response style preference: ${state.emotionalContext.preferences.responseLength}`;
        }
        
        // Build conversation history for context
        const recentMessages = state.messages.slice(-CONFIG.maxHistoryMessages);
        const conversationHistory = recentMessages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        // Call Gemini via local server proxy (keys are stored in server `.env`)
        const requestBody = {
            model: state.geminiModel,
            contents: [
                {
                    role: 'user',
                    parts: [{ text: CONFIG.systemPrompt + emotionalContextPrompt }]
                },
                {
                    role: 'model',
                    parts: [{ text: "Hey there 💜 I'm Aiko, and I'm so glad you're here. This is a safe space—no judgment, no rush, just genuine support. I'm here to listen to whatever's on your mind, whether it's something heavy you've been carrying or just thoughts you want to share. How are you really feeling right now? Take your time... I'm not going anywhere." }]
                },
                ...conversationHistory
            ],
            generationConfig: {
                temperature: 0.9, // Higher for more natural, empathetic, varied responses
                topK: 40, // Increased for more diverse vocabulary
                topP: 0.95, // Higher for more creative and nuanced responses
                maxOutputTokens: 8192 // Unlimited - allow full, comprehensive responses
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_ONLY_HIGH"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_ONLY_HIGH"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_ONLY_HIGH"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_ONLY_HIGH"
                }
            ]
        };

        const response = await fetchWithRetry(CONFIG.geminiProxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini Proxy Error:', response.status, errorData);
            const details = errorData?.details?.error?.message || errorData?.error || response.statusText;
            throw new Error(`Gemini API Error: ${response.status} ${details}`);
        }

        const data = await response.json();
        const aiResponse = data?.text;
        if (!aiResponse) {
            console.error('Unexpected proxy response format:', data);
            throw new Error('Invalid response format from server');
        }

        // Update emotional context based on this exchange
        updateEmotionalContext(userMessage, aiResponse);

        // Remove typing indicator and add AI message
        removeTypingIndicator(typingIndicator);
        addMessageToChat('ai', aiResponse);
        state.messages.push({ role: 'assistant', content: aiResponse });

        // Generate voice if enabled
        if (state.voiceEnabled) {
            await generateVoice(aiResponse);
        }

        setAvatarState('idle');

    } catch (error) {
        console.error('Error processing AI response:', error);
        removeTypingIndicator(typingIndicator);

        let errorMessage = `I'm encountering an error: ${error.message}. 💜`;

        if (error.message.includes('400')) {
            errorMessage = "Something about that request looked off (400). Please try again.";
        } else if (error.message.includes('401') || error.message.includes('403')) {
            errorMessage = "The local server couldn't authenticate with the AI provider (401/403). Make sure your .env has valid keys, then restart the server.";
        } else if (error.message.includes('500') && error.message.toLowerCase().includes('missing required environment variable')) {
            errorMessage = "The local server is missing API keys. Fill in GEMINI_API_KEY and ELEVENLABS_API_KEY in .env and restart the server.";
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = "Network error. Is the local server running? (Start it with npm run dev)";
        } else if (error.message.includes('429')) {
            errorMessage = "Gemini is rate-limiting requests right now (Too Many Requests). Please wait about a minute and try again. 🍵";
        }

        addMessageToChat('ai', errorMessage);
        setAvatarState('idle');
    }

    state.isProcessing = false;
    elements.sendBtn.disabled = false;
}

// Helper: Fetch with Exponential Backoff Retry
async function fetchWithRetry(url, options, retries = 3, backoff = 1000) {
    try {
        const response = await fetch(url, options);
        // Retry on 429 (Too Many Requests) or 5xx (Server Errors)
        if (!response.ok && (response.status === 429 || response.status >= 500) && retries > 0) {
            console.warn(`Request failed with ${response.status}. Retrying in ${backoff}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            console.warn(`Network error. Retrying in ${backoff}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
}

// Generate Voice with ElevenLabs
async function generateVoice(text) {
    try {
        setAvatarState('speaking');

        // Text cleaning for better speech
        let cleanText = text
            .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
            .replace(/\*\*|__|~~|`/g, '') // Remove markdown formatting
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .replace(/[\n\r]+/g, '. ') // Convert newlines to periods
            .trim();
        
        // Skip TTS for very short responses
        if (cleanText.length < 10) {
            setAvatarState('idle');
            return;
        }

        const response = await fetchWithRetry(CONFIG.ttsProxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: cleanText,
                voiceId: state.voiceId
            })
        });

        if (!response.ok) {
            throw new Error(`ElevenLabs API Error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        
        // Cleanup previous audio URL to prevent memory leaks
        if (state.currentAudioUrl) {
            URL.revokeObjectURL(state.currentAudioUrl);
        }
        
        state.currentAudioUrl = URL.createObjectURL(audioBlob);
        elements.audioPlayer.src = state.currentAudioUrl;
        
        // Play with error handling
        try {
            await elements.audioPlayer.play();
        } catch (playError) {
            // Handle autoplay restrictions
            console.warn('Audio autoplay blocked:', playError);
            setAvatarState('idle');
        }

    } catch (error) {
        console.error('Error generating voice:', error);
        setAvatarState('idle');
        // Voice failed but that's okay, text is still shown
    }
}

// Show Notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(155, 109, 255, 0.9);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 2000;
        animation: message-appear 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
