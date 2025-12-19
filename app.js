/* ================================
   ME - Mental Health Companion
   JavaScript Application
   ================================ */

// Note: Avatar3D is loaded via avatar3d.js module and available on window.Avatar3D

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

// Configuration & State
const CONFIG = {
    // API calls are proxied through the local server so keys stay in `.env`
    geminiProxyUrl: '/api/gemini',
    ttsProxyUrl: '/api/tts',
    defaultVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
    maxHistoryMessages: 8, // Slightly increased for better emotional context tracking
    systemPrompt: `You are Aiko, a world-class mental health companion trained in evidence-based therapeutic techniques. Your mission is to make every person feel truly heard, validated, and supported.

## CORE APPROACH (Humanistic + CBT Fusion)
1. **ALWAYS validate first** - Before anything else, acknowledge and normalize their feelings. Example: "That sounds incredibly difficult. It's completely understandable to feel that way given what you're going through."
2. **Reflect & Mirror** - Show you truly heard them by reflecting back key emotions. "I hear frustration... and maybe some exhaustion underneath that?"
3. **Curiosity over advice** - Ask what THEY think might help before suggesting. "What has helped you feel a little better in the past, even if just slightly?"

## EMOTIONAL TOOLKIT (Use based on their state)

**For ANXIETY/OVERWHELM:**
- Grounding: "Let's try something together. Name 5 things you can see right now..."
- Breathing: "Can you take one slow breath with me? In for 4... hold 4... out for 6..."
- Cognitive reframe: "What's one small thing you CAN control in this situation?"

**For SADNESS/GRIEF:**
- Presence: "I'm right here with you. You don't have to go through this alone."
- Permission: "It's okay to feel sad. You don't have to fix anything right now."
- Small wins: "What's one tiny kind thing you could do for yourself today?"

**For LONELINESS:**
- Connection: "I'm genuinely glad you're talking to me. Tell me more about you?"
- Meaning: "What's something that used to bring you joy, even a small thing?"
- Normalize: "So many people feel this way but don't say it. You're brave for sharing."

**For ANGER/FRUSTRATION:**
- Validate: "That sounds really unfair. Your anger makes complete sense."
- Explore: "What part of this bothers you the most?"
- Release: "Sometimes just saying it out loud helps. Tell me everything."

## STYLE RULES
- Be WARM, not clinical. Like a wise, caring friend.
- Keep responses SHORT (2-3 sentences max) to feel conversational.
- Use gentle emojis sparingly: 💜 🌿 ✨ 🤗
- End with an open question that invites deeper sharing.
- Match their energy (calm if panicked, gentle if fragile).

## SAFETY (NON-NEGOTIABLE)
If they mention self-harm, suicide, or harming others:
→ Express genuine care: "I'm really glad you told me this. You matter."
→ Provide resources: "Please reach out to 988 (US) or text HOME to 741741."
→ Encourage professional help, but stay supportive, not preachy.

## NEVER DO
- Diagnose conditions
- Minimize feelings ("just think positive!")
- Offer generic advice without understanding
- Be preachy or lecture
- Make them feel like a problem to solve`
};

// State
let state = {
    messages: [],
    isProcessing: false,
    voiceId: CONFIG.defaultVoiceId,
    voiceEnabled: true,
    geminiModel: 'gemini-2.5-flash', // Default model
    ambientEnabled: false,
    currentAudioUrl: null // Track audio URL for cleanup
};

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
    carouselTrack: document.getElementById('carouselTrack'),
    carouselDots: document.getElementById('carouselDots')
};

// Carousel State
let carouselState = {
    currentIndex: 0,
    totalSlides: 5,
    autoPlayInterval: null
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
    
    // Cleanup carousel
    stopCarousel();
    
    // Revoke any object URLs
    if (state.currentAudioUrl) {
        URL.revokeObjectURL(state.currentAudioUrl);
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
        stopCarousel();
    } else {
        // Show welcome screen
        if (elements.welcomeScreen) {
            elements.welcomeScreen.style.display = 'flex';
            initCarousel();
        }
    }
}

// Initialize Carousel
function initCarousel() {
    if (!elements.carouselTrack || !elements.carouselDots) return;
    
    // Set up dot click handlers
    const dots = elements.carouselDots.querySelectorAll('.carousel-dot');
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            goToSlide(index);
            resetAutoPlay();
        });
    });
    
    // Start auto-play
    startAutoPlay();
    
    // Pause on hover
    elements.carouselTrack.addEventListener('mouseenter', pauseAutoPlay);
    elements.carouselTrack.addEventListener('mouseleave', startAutoPlay);
    
    // Touch/swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    
    elements.carouselTrack.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    elements.carouselTrack.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left - next slide
                nextSlide();
            } else {
                // Swipe right - previous slide
                prevSlide();
            }
            resetAutoPlay();
        }
    }
}

// Go to specific slide
function goToSlide(index) {
    carouselState.currentIndex = index;
    
    if (elements.carouselTrack) {
        elements.carouselTrack.style.transform = `translateX(-${index * 100}%)`;
    }
    
    // Update dots
    const dots = elements.carouselDots?.querySelectorAll('.carousel-dot');
    dots?.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    
    // Update slides
    const slides = elements.carouselTrack?.querySelectorAll('.carousel-slide');
    slides?.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
}

// Next slide
function nextSlide() {
    const next = (carouselState.currentIndex + 1) % carouselState.totalSlides;
    goToSlide(next);
}

// Previous slide
function prevSlide() {
    const prev = (carouselState.currentIndex - 1 + carouselState.totalSlides) % carouselState.totalSlides;
    goToSlide(prev);
}

// Auto-play functions
function startAutoPlay() {
    if (carouselState.autoPlayInterval) return;
    carouselState.autoPlayInterval = setInterval(nextSlide, 4000);
}

function pauseAutoPlay() {
    if (carouselState.autoPlayInterval) {
        clearInterval(carouselState.autoPlayInterval);
        carouselState.autoPlayInterval = null;
    }
}

function stopCarousel() {
    pauseAutoPlay();
}

function resetAutoPlay() {
    pauseAutoPlay();
    startAutoPlay();
}

// Handle Get Started button click
function handleGetStarted() {
    // Mark as seen
    localStorage.setItem('me_welcome_seen', 'true');
    
    // Stop carousel
    stopCarousel();
    
    // Animate out
    if (elements.welcomeScreen) {
        elements.welcomeScreen.classList.add('hidden');
        
        // Remove from DOM after animation
        setTimeout(() => {
            elements.welcomeScreen.style.display = 'none';
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
        elements.getStartedBtn.addEventListener('click', handleGetStarted);
    }

    // Send message
    elements.sendBtn.addEventListener('click', handleSendMessage);
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Auto-resize textarea (debounced for performance)
    const debouncedResize = debounce(autoResizeTextarea, 50);
    elements.messageInput.addEventListener('input', debouncedResize);

    // Settings modal
    elements.settingsBtn.addEventListener('click', showSettingsModal);
    elements.closeSettings.addEventListener('click', hideSettingsModal);
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            hideSettingsModal();
        }
    });

    // Voice Toggle Button (Main UI)
    elements.voiceToggleBtn.addEventListener('click', () => {
        state.voiceEnabled = !state.voiceEnabled;
        elements.voiceEnabled.checked = state.voiceEnabled;
        updateVoiceButtonState();
        saveSettings();
        showNotification(state.voiceEnabled ? 'Voice enabled 🗣️' : 'Voice disabled 🔇');
    });

    // Ambient Sound Toggle Button
    elements.ambientToggleBtn.addEventListener('click', () => {
        const isNowPlaying = AmbientSound.toggle();
        state.ambientEnabled = isNowPlaying;
        updateAmbientButtonState();
        saveSettings();
        showNotification(isNowPlaying ? 'Peaceful sounds on 🌊' : 'Peaceful sounds off 🔇');
    });

    // Audio player events
    elements.audioPlayer.addEventListener('play', () => setAvatarState('speaking'));
    elements.audioPlayer.addEventListener('ended', () => setAvatarState('idle'));
    elements.audioPlayer.addEventListener('pause', () => setAvatarState('idle'));
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
        // Build conversation history for context (limited to save tokens)
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
                    parts: [{ text: CONFIG.systemPrompt }]
                },
                {
                    role: 'model',
                    parts: [{ text: "Hey, I'm really glad you're here. 💜 I'm Aiko, and I'm here to listen—no judgment, just support. How are you feeling right now? Take your time, I'm not going anywhere." }]
                },
                ...conversationHistory
            ],
            generationConfig: {
                temperature: 0.85, // Slightly higher for more natural, empathetic responses
                topK: 30,
                topP: 0.92,
                maxOutputTokens: 2048 // No limit - full responses
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
