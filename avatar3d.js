/* ================================
   ME - Mental Health Companion
   3D Avatar Module (Three.js)
   Enhanced with 3D Room, Lighting & Physics
   ================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Avatar3D Module
const Avatar3D = {
    // Three.js components
    scene: null,
    camera: null,
    renderer: null,
    model: null,
    mixer: null,
    clock: null,
    controls: null,

    // Room components
    room: null,
    floor: null,
    particles: [],
    floatingOrbs: [],
    lights: {},
    bones: {
        hips: null,
        spine: null,
        head: null,
        neck: null,
        rightArm: null,
        rightForeArm: null,
        leftArm: null,
        leftForeArm: null
    },

    // Animation state
    animations: {},
    currentAction: null,
    animationFrameId: null,
    isRendering: false,

    // Morph targets (blendshapes)
    morphTargets: null,

    // Base pose (captured after scaling/positioning) so we can apply
    // lifelike motion without accumulating drift.
    basePose: null,

    // Idle gesture scheduler (nods, look-aways, etc.)
    idleGesture: {
        current: null,
        nextAt: 0
    },

    // User engagement
    mousePosition: { x: 0, y: 0 },
    targetLookAt: { x: 0, y: 0 },
    breathingOffset: 0,
    hasWaved: false,

    // Human-like behavior state
    blinkState: {
        isBlinking: false,
        nextBlinkTime: 0,
        blinkProgress: 0,
        blinkDuration: 0.15,
        doubleBlinkChance: 0.2
    },
    microMovement: {
        swayOffset: 0,
        headTilt: 0,
        shoulderShift: 0,
        noiseTime: 0
    },
    springPhysics: {
        velocity: { x: 0, y: 0 },
        damping: 0.92,
        stiffness: 0.08
    },
    // High-level activity state (used to drive motion intensity)
    currentAvatarState: 'idle',
    // Expression/emotion target (morph targets)
    currentEmotion: 'idle',

    // Configuration
    config: {
        modelPath: 'free_3d_anime_character.glb',
        containerId: 'avatar',
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        roomSize: { width: 6, height: 4, depth: 5 },
        particleCount: 50
    },

    /**
     * Initialize the 3D avatar with room
     * @param {string} containerId - ID of the container element
     * @returns {Promise<void>}
     */
    async init(containerId = 'avatar') {
        this.config.containerId = containerId;
        const container = document.getElementById(containerId);

        if (!container) {
            console.error('Avatar container not found:', containerId);
            return;
        }

        try {
            this.showLoadingIndicator(container);
            this.setupScene(container);
            // Disabled room, particles and orbs for cleaner look
            // this.setupRoom();
            this.setupLighting();
            // this.setupParticles();
            // this.setupFloatingOrbs();
            this.setupCamera(container);
            this.setupRenderer(container);
            
            // Load model with timeout
            const loadPromise = this.loadModel();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Model load timeout')), 20000)
            );
            
            await Promise.race([loadPromise, timeoutPromise]);
            
            this.setupMouseTracking(container);
            this.setupResizeHandler();
            this.setupVisibilityObserver(container);
            
            // Success! Hide loading and fallback
            this.hideLoadingIndicator(container);
            this.hideFallback(container);
            
            this.startRenderLoop();
        } catch (error) {
            console.error('Failed to initialize 3D avatar:', error);
            this.hideLoadingIndicator(container);
            this.showFallback(container);
        }
    },

    /**
     * Capture the model's base pose (position/rotation/scale). Call this after
     * scaleModelToFit() or whenever we intentionally reposition the model.
     */
    captureBasePose() {
        if (!this.model) return;
        this.basePose = {
            position: this.model.position.clone(),
            rotation: this.model.rotation.clone(),
            scale: this.model.scale.clone()
        };
    },

    /**
     * Set up the Three.js scene
     */
    setupScene(container) {
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();

        // Create dreamy ocean shader background
        this.setupOceanBackground();

        // Add fog for depth with ocean color
        this.scene.fog = new THREE.Fog(0x0a1628, 5, 20);
    },

    /**
     * Create the dreamy ocean coherent background effect
     */
    setupOceanBackground() {
        // Ocean + Storm shader - creates flowing ocean with dramatic sky, clouds & lightning
        const oceanVertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const oceanFragmentShader = `
            uniform float uTime;
            uniform vec2 uResolution;
            uniform float uLightningFlash;
            varying vec2 vUv;

            // Simplex noise functions for organic movement
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                                   -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy));
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m; m = m*m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                vec3 g;
                g.x = a0.x * x0.x + h.x * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            // Fractal Brownian Motion for layered effects
            float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                for (int i = 0; i < 6; i++) {
                    value += amplitude * snoise(p * frequency);
                    frequency *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }

            // Volumetric cloud function
            float clouds(vec2 uv, float time, float scale, float speed) {
                vec2 p = uv * scale;
                float cloud = 0.0;
                cloud += fbm(p + vec2(time * speed, time * speed * 0.5)) * 0.5;
                cloud += fbm(p * 2.0 - vec2(time * speed * 0.7, 0.0)) * 0.25;
                cloud += fbm(p * 4.0 + vec2(0.0, time * speed * 0.3)) * 0.125;
                return smoothstep(0.1, 0.8, cloud);
            }

            // Lightning bolt function
            float lightning(vec2 uv, float time, float seed) {
                float bolt = 0.0;
                vec2 p = uv;
                p.x += snoise(vec2(p.y * 10.0, seed)) * 0.1;
                
                // Main bolt
                float width = 0.008;
                bolt = smoothstep(width, 0.0, abs(p.x - 0.5));
                
                // Branches
                for (int i = 0; i < 3; i++) {
                    float fi = float(i);
                    float branchY = 0.3 + fi * 0.2;
                    if (p.y > branchY && p.y < branchY + 0.15) {
                        float branchX = 0.5 + snoise(vec2(fi * 100.0, seed)) * 0.2;
                        vec2 branchDir = normalize(vec2(snoise(vec2(fi, seed)) * 2.0, -1.0));
                        float t = (p.y - branchY) / 0.15;
                        vec2 branchPos = vec2(branchX, branchY) + branchDir * t * 0.15;
                        bolt += smoothstep(width * 0.7, 0.0, length(p - branchPos)) * (1.0 - t);
                    }
                }
                
                return bolt;
            }

            // Ocean wave coherent pattern
            float oceanWaves(vec2 uv, float time) {
                float wave = 0.0;
                vec2 p = uv * 3.0;
                
                // Multiple wave layers for coherent effect
                wave += sin(p.x * 2.0 + time * 1.5 + snoise(p) * 2.0) * 0.5;
                wave += sin(p.x * 4.0 - time * 2.0 + snoise(p * 2.0) * 1.5) * 0.25;
                wave += sin(p.x * 8.0 + time * 2.5 + snoise(p * 3.0)) * 0.125;
                wave += snoise(p + vec2(time * 0.5, 0.0)) * 0.3;
                
                return wave;
            }

            void main() {
                vec2 uv = vUv;
                float time = uTime * 0.2;

                // Split screen: sky (top 60%) and ocean (bottom 40%)
                float horizonLine = 0.4;
                float horizonBlend = smoothstep(horizonLine - 0.05, horizonLine + 0.05, uv.y);

                // === SKY SECTION ===
                // Storm sky colors
                vec3 darkSky = vec3(0.02, 0.03, 0.08);
                vec3 stormGray = vec3(0.08, 0.1, 0.15);
                vec3 stormPurple = vec3(0.15, 0.08, 0.2);
                vec3 cloudLight = vec3(0.25, 0.28, 0.35);
                vec3 cloudDark = vec3(0.05, 0.06, 0.1);

                // Sky gradient
                float skyGrad = smoothstep(horizonLine, 1.0, uv.y);
                vec3 skyCol = mix(stormGray, darkSky, skyGrad);
                skyCol = mix(skyCol, stormPurple, sin(uv.x * 3.14) * 0.3);

                // Volumetric clouds
                float cloud1 = clouds(uv, time, 2.0, 0.1);
                float cloud2 = clouds(uv + vec2(100.0, 50.0), time * 0.8, 3.0, 0.08);
                float cloud3 = clouds(uv + vec2(200.0, 100.0), time * 1.2, 1.5, 0.12);

                // Layer clouds with depth
                vec3 cloudCol = mix(cloudDark, cloudLight, cloud1 * 0.5 + 0.5);
                skyCol = mix(skyCol, cloudCol, cloud1 * 0.7 * skyGrad);
                skyCol = mix(skyCol, cloudDark, cloud2 * 0.4 * skyGrad);
                skyCol = mix(skyCol, cloudLight * 1.2, cloud3 * 0.3 * skyGrad);

                // Lightning flash effect
                float flash = uLightningFlash;
                if (flash > 0.0) {
                    // Lightning bolt
                    float bolt = lightning(uv, time, floor(uTime * 0.5));
                    skyCol += vec3(0.8, 0.85, 1.0) * bolt * flash * 3.0;
                    
                    // Sky illumination from lightning
                    skyCol += vec3(0.2, 0.22, 0.35) * flash * cloud1;
                }

                // Distant lightning flickers in clouds
                float distantFlash = pow(snoise(vec2(uTime * 2.0, 0.0)) * 0.5 + 0.5, 8.0);
                skyCol += vec3(0.1, 0.12, 0.2) * distantFlash * cloud2 * 0.5;

                // === OCEAN SECTION ===
                // Ocean colors
                vec3 deepOcean = vec3(0.01, 0.03, 0.08);
                vec3 oceanMid = vec3(0.02, 0.08, 0.18);
                vec3 oceanSurface = vec3(0.05, 0.15, 0.25);
                vec3 waveHighlight = vec3(0.1, 0.25, 0.4);
                vec3 foam = vec3(0.4, 0.5, 0.6);

                // Ocean depth gradient
                float oceanGrad = smoothstep(0.0, horizonLine, uv.y);
                vec3 oceanCol = mix(deepOcean, oceanMid, oceanGrad);
                oceanCol = mix(oceanCol, oceanSurface, pow(oceanGrad, 2.0));

                // Coherent ocean waves
                float wave = oceanWaves(uv, time);
                float waveIntensity = wave * 0.5 + 0.5;
                oceanCol = mix(oceanCol, waveHighlight, waveIntensity * 0.4 * oceanGrad);

                // Wave foam on peaks
                float foamLine = smoothstep(0.6, 0.8, waveIntensity) * oceanGrad;
                oceanCol = mix(oceanCol, foam, foamLine * 0.3);

                // Reflection of sky/lightning on water
                vec3 reflection = skyCol * 0.3;
                reflection += vec3(0.3, 0.35, 0.5) * flash * 0.5;
                float reflectStrength = pow(oceanGrad, 0.5) * 0.4;
                oceanCol = mix(oceanCol, reflection, reflectStrength);

                // Water caustics
                float caustic = snoise(uv * 15.0 + vec2(time, time * 0.7)) * 0.5 + 0.5;
                caustic = pow(caustic, 3.0);
                oceanCol += vec3(0.05, 0.1, 0.15) * caustic * (1.0 - oceanGrad) * 0.5;

                // === COMBINE SKY AND OCEAN ===
                vec3 col = mix(oceanCol, skyCol, horizonBlend);

                // Horizon glow
                float horizonGlow = exp(-pow((uv.y - horizonLine) * 10.0, 2.0));
                col += vec3(0.1, 0.12, 0.2) * horizonGlow * 0.5;

                // Rain effect
                float rain = 0.0;
                for (int i = 0; i < 10; i++) {
                    float fi = float(i);
                    vec2 rainUV = uv;
                    rainUV.x += sin(fi * 127.1) * 0.1;
                    rainUV.y = fract(rainUV.y + time * (2.0 + fi * 0.3) + fi * 0.1);
                    float drop = smoothstep(0.01, 0.0, abs(rainUV.x - fract(sin(fi * 311.7) * 43758.5)));
                    drop *= smoothstep(0.0, 0.05, rainUV.y) * smoothstep(0.1, 0.05, rainUV.y);
                    rain += drop * 0.03;
                }
                col += vec3(0.3, 0.35, 0.5) * rain;

                // Atmospheric fog/mist near horizon
                float mist = exp(-pow((uv.y - horizonLine) * 5.0, 2.0)) * 0.3;
                col = mix(col, vec3(0.1, 0.12, 0.18), mist);

                // Vignette for focus
                float vignette = 1.0 - length((uv - 0.5) * vec2(1.2, 1.0));
                vignette = smoothstep(0.0, 0.7, vignette);
                col *= vignette * 0.7 + 0.3;

                // Final color grading
                col = pow(col, vec3(0.95));

                gl_FragColor = vec4(col, 1.0);
            }
        `;

        // Create shader material
        this.oceanUniforms = {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uLightningFlash: { value: 0 }
        };

        const oceanMaterial = new THREE.ShaderMaterial({
            uniforms: this.oceanUniforms,
            vertexShader: oceanVertexShader,
            fragmentShader: oceanFragmentShader,
            side: THREE.BackSide
        });

        // Create large sphere for background
        const bgGeometry = new THREE.SphereGeometry(50, 32, 32);
        this.oceanBackground = new THREE.Mesh(bgGeometry, oceanMaterial);
        this.scene.add(this.oceanBackground);

        // Initialize lightning state
        this.lightningState = {
            nextFlash: 2 + Math.random() * 5,
            flashIntensity: 0,
            isFlashing: false
        };

        // Add underwater wave mesh effects
        this.setupUnderwaterWaves();
    },

    /**
     * Create real underwater wave effect with caustic light rays
     */
    setupUnderwaterWaves() {
        this.underwaterWaves = [];
        
        // Create underwater wave planes with caustic shader
        const waveVertexShader = `
            varying vec2 vUv;
            varying vec3 vPosition;
            uniform float uTime;
            
            void main() {
                vUv = uv;
                vPosition = position;
                
                // Wave displacement
                vec3 pos = position;
                float wave = sin(pos.x * 2.0 + uTime) * 0.1;
                wave += sin(pos.x * 3.0 - uTime * 0.7) * 0.05;
                wave += cos(pos.z * 2.5 + uTime * 0.8) * 0.08;
                pos.y += wave;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;
        
        const waveFragmentShader = `
            varying vec2 vUv;
            varying vec3 vPosition;
            uniform float uTime;
            uniform float uLightningFlash;
            
            // Simplex noise for caustics
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
            
            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                                   -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy));
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m; m = m*m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
                vec3 g;
                g.x = a0.x * x0.x + h.x * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }
            
            // Underwater caustic pattern
            float caustics(vec2 uv, float time) {
                float c = 0.0;
                // Layer multiple sine waves for caustic interference pattern
                c += sin(uv.x * 15.0 + time + sin(uv.y * 10.0 + time * 0.7));
                c += sin(uv.y * 12.0 - time * 0.8 + sin(uv.x * 8.0 + time * 0.5));
                c += sin((uv.x + uv.y) * 10.0 + time * 0.6);
                c += sin((uv.x - uv.y) * 8.0 - time * 0.9);
                c = c * 0.25 + 0.5;
                c = pow(c, 3.0); // Sharpen caustics
                return c;
            }
            
            void main() {
                vec2 uv = vUv;
                float time = uTime * 0.5;
                
                // Animate UV for wave motion
                vec2 animUV = uv + vec2(sin(time * 0.3) * 0.1, cos(time * 0.2) * 0.1);
                
                // Multiple caustic layers
                float caustic1 = caustics(animUV * 2.0, time);
                float caustic2 = caustics(animUV * 3.5 + vec2(100.0), time * 1.3);
                float caustic3 = caustics(animUV * 1.5 + vec2(50.0), time * 0.7);
                
                float caustic = (caustic1 + caustic2 * 0.5 + caustic3 * 0.3) / 1.8;
                
                // Water colors
                vec3 deepBlue = vec3(0.02, 0.05, 0.15);
                vec3 lightBlue = vec3(0.1, 0.3, 0.5);
                vec3 causticColor = vec3(0.2, 0.5, 0.7);
                
                // Wave ripple distortion
                float ripple = snoise(uv * 8.0 + vec2(time, time * 0.5)) * 0.5 + 0.5;
                
                // Combine colors
                vec3 col = mix(deepBlue, lightBlue, ripple * 0.5);
                col += causticColor * caustic * 0.6;
                
                // Add light rays effect
                float rays = 0.0;
                for (int i = 0; i < 5; i++) {
                    float fi = float(i);
                    float rayX = sin(fi * 1.618 + time * 0.2) * 0.3 + 0.5;
                    float rayWidth = 0.02 + sin(fi * 2.0 + time) * 0.01;
                    float ray = smoothstep(rayWidth, 0.0, abs(uv.x - rayX));
                    ray *= smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.5, uv.y);
                    ray *= 0.3 + sin(uv.y * 20.0 + time + fi) * 0.1;
                    rays += ray;
                }
                col += vec3(0.15, 0.35, 0.5) * rays * 0.5;
                
                // Lightning enhancement
                col += vec3(0.2, 0.3, 0.4) * uLightningFlash * caustic;
                
                // Edge fade for seamless blend
                float edgeFade = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
                edgeFade *= smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);
                
                float alpha = (caustic * 0.4 + rays * 0.3 + ripple * 0.2) * edgeFade * 0.7;
                
                gl_FragColor = vec4(col, alpha);
            }
        `;
        
        // Create multiple wave planes at different depths
        const waveLayers = [
            { z: -8, scale: 15, opacity: 0.4 },
            { z: -6, scale: 12, opacity: 0.35 },
            { z: -4, scale: 10, opacity: 0.3 },
            { z: -10, scale: 18, opacity: 0.25 }
        ];
        
        waveLayers.forEach((layer, index) => {
            const waveUniforms = {
                uTime: { value: 0 },
                uLightningFlash: { value: 0 }
            };
            
            const waveMaterial = new THREE.ShaderMaterial({
                uniforms: waveUniforms,
                vertexShader: waveVertexShader,
                fragmentShader: waveFragmentShader,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            
            const waveGeometry = new THREE.PlaneGeometry(layer.scale, layer.scale * 0.6, 32, 32);
            const waveMesh = new THREE.Mesh(waveGeometry, waveMaterial);
            
            waveMesh.position.set(0, -1, layer.z);
            waveMesh.rotation.x = -0.2; // Slight tilt for perspective
            
            waveMesh.userData = {
                uniforms: waveUniforms,
                baseZ: layer.z,
                floatSpeed: 0.3 + Math.random() * 0.2,
                floatPhase: Math.random() * Math.PI * 2
            };
            
            this.underwaterWaves.push(waveMesh);
            this.scene.add(waveMesh);
        });
        
        // Create floating bubble particles (subtle, not circles)
        this.bubbles = [];
        const bubbleCount = 30;
        
        for (let i = 0; i < bubbleCount; i++) {
            const bubbleGeometry = new THREE.SphereGeometry(0.015 + Math.random() * 0.02, 8, 8);
            const bubbleMaterial = new THREE.MeshBasicMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.15 + Math.random() * 0.15
            });
            
            const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
            
            bubble.position.set(
                (Math.random() - 0.5) * 10,
                -3 + Math.random() * 6,
                -3 - Math.random() * 8
            );
            
            bubble.userData = {
                originalPos: bubble.position.clone(),
                speed: 0.2 + Math.random() * 0.3,
                wobble: 0.1 + Math.random() * 0.2,
                phase: Math.random() * Math.PI * 2
            };
            
            this.bubbles.push(bubble);
            this.scene.add(bubble);
        }
    },

    /**
     * Update ocean background animation
     */
    updateOceanBackground(time) {
        if (this.oceanUniforms) {
            this.oceanUniforms.uTime.value = time;
        }

        // Lightning system
        if (this.lightningState && this.oceanUniforms) {
            // Check if it's time for a lightning flash
            if (time >= this.lightningState.nextFlash && !this.lightningState.isFlashing) {
                this.lightningState.isFlashing = true;
                this.lightningState.flashIntensity = 1.0;
                
                // Multiple quick flashes for realistic thunder
                const flashCount = 1 + Math.floor(Math.random() * 3);
                let delay = 0;
                for (let i = 0; i < flashCount; i++) {
                    delay += 50 + Math.random() * 150;
                }
            }

            // Decay flash intensity
            if (this.lightningState.isFlashing) {
                this.lightningState.flashIntensity *= 0.85;
                if (this.lightningState.flashIntensity < 0.01) {
                    this.lightningState.isFlashing = false;
                    this.lightningState.flashIntensity = 0;
                    // Schedule next flash (3-12 seconds)
                    this.lightningState.nextFlash = time + 3 + Math.random() * 9;
                }
            }

            this.oceanUniforms.uLightningFlash.value = this.lightningState.flashIntensity;
        }

        // Animate underwater wave layers
        if (this.underwaterWaves) {
            this.underwaterWaves.forEach((wave) => {
                const { uniforms, baseZ, floatSpeed, floatPhase } = wave.userData;
                
                // Update shader time
                uniforms.uTime.value = time;
                uniforms.uLightningFlash.value = this.lightningState ? this.lightningState.flashIntensity : 0;
                
                // Gentle floating motion
                wave.position.z = baseZ + Math.sin(time * floatSpeed + floatPhase) * 0.3;
                wave.position.y = -1 + Math.sin(time * floatSpeed * 0.7 + floatPhase) * 0.2;
            });
        }
        
        // Animate bubbles
        if (this.bubbles) {
            this.bubbles.forEach((bubble) => {
                const { originalPos, speed, wobble, phase } = bubble.userData;
                
                // Rising motion
                bubble.position.y = originalPos.y + (time * speed * 0.5) % 8 - 2;
                
                // Wobble side to side
                bubble.position.x = originalPos.x + Math.sin(time * speed + phase) * wobble;
                bubble.position.z = originalPos.z + Math.cos(time * speed * 0.7 + phase) * wobble * 0.5;
                
                // Reset bubble when it goes too high
                if (bubble.position.y > 4) {
                    bubble.position.y = -3;
                }
                
                // Pulse opacity with lightning
                const flash = this.lightningState ? this.lightningState.flashIntensity : 0;
                bubble.material.opacity = (0.15 + Math.sin(time * speed * 2 + phase) * 0.05) + flash * 0.2;
            });
        }
    },

    /**
     * Create the 3D room environment
     */
    setupRoom() {
        const { width, height, depth } = this.config.roomSize;
        this.room = new THREE.Group();

        // Floor with reflective material
        const floorGeometry = new THREE.PlaneGeometry(width, depth);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1025,
            roughness: 0.3,
            metalness: 0.5,
            envMapIntensity: 0.5
        });
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = 0;
        this.floor.receiveShadow = true;
        this.room.add(this.floor);

        // Grid pattern on floor for depth perception
        const gridHelper = new THREE.GridHelper(width, 20, 0x4a2b8f, 0x2d1b54);
        gridHelper.position.y = 0.01;
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.room.add(gridHelper);

        // Back wall with gradient-like effect
        const wallGeometry = new THREE.PlaneGeometry(width, height);
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x15101f,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
        backWall.position.set(0, height / 2, -depth / 2);
        backWall.receiveShadow = true;
        this.room.add(backWall);

        // Soft glow panels on wall
        this.createGlowPanels();

        this.scene.add(this.room);
    },

    /**
     * Create decorative glow panels on the wall
     */
    createGlowPanels() {
        const panelPositions = [
            { x: -2, y: 2.5, color: 0x9b6dff },
            { x: 2, y: 2.5, color: 0xff6b9d },
            { x: 0, y: 3, color: 0x64d8ff }
        ];

        panelPositions.forEach(pos => {
            const geometry = new THREE.CircleGeometry(0.3, 32);
            const material = new THREE.MeshBasicMaterial({
                color: pos.color,
                transparent: true,
                opacity: 0.6
            });
            const panel = new THREE.Mesh(geometry, material);
            panel.position.set(pos.x, pos.y, -this.config.roomSize.depth / 2 + 0.1);
            this.room.add(panel);

            // Glow ring around panel
            const ringGeometry = new THREE.RingGeometry(0.3, 0.5, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: pos.color,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.copy(panel.position);
            ring.position.z += 0.01;
            this.room.add(ring);
        });
    },

    /**
     * Set up enhanced lighting system
     */
    setupLighting() {
        // Ambient light for base illumination
        this.lights.ambient = new THREE.AmbientLight(0x6b4d9e, 0.4);
        this.scene.add(this.lights.ambient);

        // Main key light (purple-ish)
        this.lights.key = new THREE.DirectionalLight(0x9b6dff, 1.2);
        this.lights.key.position.set(2, 4, 3);
        this.lights.key.castShadow = true;
        this.lights.key.shadow.mapSize.width = 1024;
        this.lights.key.shadow.mapSize.height = 1024;
        this.lights.key.shadow.camera.near = 0.5;
        this.lights.key.shadow.camera.far = 15;
        this.lights.key.shadow.bias = -0.001;
        this.scene.add(this.lights.key);

        // Fill light (pink accent)
        this.lights.fill = new THREE.DirectionalLight(0xff6b9d, 0.5);
        this.lights.fill.position.set(-3, 2, 2);
        this.scene.add(this.lights.fill);

        // Rim light for avatar pop (cyan)
        this.lights.rim = new THREE.PointLight(0x64d8ff, 1.0, 8);
        this.lights.rim.position.set(0, 2, -1);
        this.scene.add(this.lights.rim);

        // Bottom accent light
        this.lights.bottom = new THREE.PointLight(0x9b6dff, 0.5, 5);
        this.lights.bottom.position.set(0, 0.2, 2);
        this.scene.add(this.lights.bottom);

        // Spotlight on avatar
        this.lights.spot = new THREE.SpotLight(0xffffff, 0.8, 10, Math.PI / 6, 0.5);
        this.lights.spot.position.set(0, 5, 2);
        this.lights.spot.target.position.set(0, 1, 0);
        this.lights.spot.castShadow = true;
        this.scene.add(this.lights.spot);
        this.scene.add(this.lights.spot.target);
    },

    /**
     * Create floating particles for atmosphere
     */
    setupParticles() {
        const particleCount = this.config.isMobile ? 25 : this.config.particleCount;

        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0x9b6dff : 0xff6b9d,
                transparent: true,
                opacity: 0.4 + Math.random() * 0.4
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(
                (Math.random() - 0.5) * this.config.roomSize.width,
                Math.random() * this.config.roomSize.height,
                (Math.random() - 0.5) * this.config.roomSize.depth
            );

            // Store animation properties
            particle.userData = {
                speed: 0.2 + Math.random() * 0.5,
                amplitude: 0.3 + Math.random() * 0.5,
                offset: Math.random() * Math.PI * 2
            };

            this.particles.push(particle);
            this.scene.add(particle);
        }
    },

    /**
     * Create floating decorative orbs
     */
    setupFloatingOrbs() {
        const orbColors = [0x9b6dff, 0xff6b9d, 0x64d8ff];
        const orbPositions = [
            { x: -2, y: 1.5, z: -1 },
            { x: 2.2, y: 2, z: -0.5 },
            { x: -1.5, y: 2.8, z: 0.5 }
        ];

        orbPositions.forEach((pos, i) => {
            // Inner glow orb
            const orbGeometry = new THREE.SphereGeometry(0.15, 16, 16);
            const orbMaterial = new THREE.MeshBasicMaterial({
                color: orbColors[i],
                transparent: true,
                opacity: 0.8
            });
            const orb = new THREE.Mesh(orbGeometry, orbMaterial);
            orb.position.set(pos.x, pos.y, pos.z);

            // Outer glow
            const glowGeometry = new THREE.SphereGeometry(0.25, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: orbColors[i],
                transparent: true,
                opacity: 0.2
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            orb.add(glow);

            orb.userData = {
                baseY: pos.y,
                speed: 0.5 + i * 0.2,
                amplitude: 0.2
            };

            this.floatingOrbs.push(orb);
            this.scene.add(orb);

            // Add point light to each orb
            const orbLight = new THREE.PointLight(orbColors[i], 0.3, 3);
            orb.add(orbLight);
        });
    },

    /**
     * Set up the camera
     */
    setupCamera(container) {
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 400;
        const aspect = width / height;

        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
        // Position camera to see full body, centered view
        this.camera.position.set(0, 1.0, 4.0);
        this.camera.lookAt(0, 1.0, 0);
    },

    /**
     * Set up the WebGL renderer
     */
    setupRenderer(container) {
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 400;

        const rendererConfig = {
            antialias: !this.config.isMobile,
            alpha: false,
            powerPreference: this.config.isMobile ? 'low-power' : 'high-performance'
        };

        this.renderer = new THREE.WebGLRenderer(rendererConfig);
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(this.config.isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // Style the canvas
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.borderRadius = '16px';

        // Clear existing content and add canvas
        const existingCanvas = container.querySelector('canvas');
        if (existingCanvas) existingCanvas.remove();

        // Note: We don't hide the CSS avatar here anymore. 
        // It will be hidden only after the 3D model is fully loaded.

        container.appendChild(this.renderer.domElement);

        // Handle WebGL context loss
        this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            this.pauseRendering();
        });

        this.renderer.domElement.addEventListener('webglcontextrestored', () => {
            this.resumeRendering();
        });
    },


    /**
     * Load the GLB model
     */
    async loadModel() {
        const loader = new GLTFLoader();

        return new Promise((resolve, reject) => {
            loader.load(
                this.config.modelPath,
                (gltf) => {
                    this.model = gltf.scene;

                    // No rotation - load model as-is from file
                    // Scale and position the model
                    this.scaleModelToFit();

                    // Capture base pose (used by lifelike motion)
                    this.captureBasePose();

                    // Enable shadows on model and find morph targets
                    this.morphTargets = [];
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // Check for morph targets (blend shapes for expressions)
                            if (child.morphTargetInfluences && child.morphTargetDictionary) {
                                this.morphTargets.push({
                                    mesh: child,
                                    dictionary: child.morphTargetDictionary,
                                    influences: child.morphTargetInfluences
                                });
                                console.log('Found morph targets:', Object.keys(child.morphTargetDictionary));
                            }
                        }
                    });

                    // Find bones for procedural animation
                    this.findBones(this.model);

                    // Set up animations if available
                    if (gltf.animations && gltf.animations.length > 0) {
                        this.setupAnimations(gltf.animations);
                    }

                    this.scene.add(this.model);
                    resolve();
                },
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100).toFixed(0);
                    console.log(`Loading 3D model: ${percent}%`);
                },
                (error) => {
                    console.error('Error loading GLB model:', error);
                    reject(error);
                }
            );
        });
    },

    /**
     * Scale model to fit container
     */
    scaleModelToFit() {
        if (!this.model) return;

        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(this.model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Scale to fit full body in view (smaller scale to see entire character)
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.0 / maxDim;
        this.model.scale.setScalar(scale);

        // Recalculate bounding box after scaling
        box.setFromObject(this.model);
        const newCenter = box.getCenter(new THREE.Vector3());

        // Position model on the LEFT side of the screen
        this.model.position.x = -newCenter.x - 1.5;
        this.model.position.y = -box.min.y;
        this.model.position.z = -newCenter.z;

        // Note: captureBasePose() is called by loadModel() after this method.
    },

    /**
     * Set up mouse tracking for eye following
     */
    setupMouseTracking(container) {
        const updateMousePosition = (e) => {
            const rect = container.getBoundingClientRect();
            // Normalized mouse position (-1 to 1)
            this.mousePosition.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mousePosition.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        };

        // Track mouse globally for better engagement
        document.addEventListener('mousemove', updateMousePosition);
        
        container.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                updateMousePosition({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
            }
        });

        // Wave when user first interacts
        container.addEventListener('mouseenter', () => {
            if (!this.hasWaved) {
                setTimeout(() => this.playWaveAnimation(), 500);
            }
        });
        
        // React to clicks
        container.addEventListener('click', () => {
            this.setEmotionalState('happy');
            setTimeout(() => this.setEmotionalState('idle'), 2000);
        });
    },

    /**
     * Set up animations from the loaded model
     */
    setupAnimations(animations) {
        this.mixer = new THREE.AnimationMixer(this.model);

        // Store all animations
        animations.forEach((clip) => {
            const action = this.mixer.clipAction(clip);
            this.animations[clip.name.toLowerCase()] = action;
            console.log('Found animation:', clip.name);
        });

        // Play idle animation by default
        this.setState('idle');
    },

    /**
     * Set avatar state (idle, speaking, thinking, listening)
     * @param {string} state - The state to set
     */
    setState(state) {
        if (!this.mixer) {
            // If no animations, use simple rotation effects
            this.applySimpleAnimation(state);
            return;
        }

        const animationMap = {
            idle: ['idle', 'stand', 'default', 'rest'],
            speaking: ['talk', 'speak', 'talking', 'speaking'],
            thinking: ['think', 'thinking', 'ponder', 'idle'],
            listening: ['listen', 'listening', 'attention', 'idle']
        };

        const possibleNames = animationMap[state] || animationMap.idle;
        let targetAction = null;

        // Find matching animation
        for (const name of possibleNames) {
            if (this.animations[name]) {
                targetAction = this.animations[name];
                break;
            }
        }

        // Fallback to first available animation
        if (!targetAction) {
            const availableAnimations = Object.values(this.animations);
            if (availableAnimations.length > 0) {
                targetAction = availableAnimations[0];
            }
        }

        if (targetAction && targetAction !== this.currentAction) {
            // Smooth transition between animations
            if (this.currentAction) {
                this.currentAction.fadeOut(0.3);
            }
            targetAction.reset().fadeIn(0.3).play();
            this.currentAction = targetAction;
        }

        // Apply additional visual effects based on state
        this.currentAvatarState = state;
        this.applyStateEffects(state);
    },

    /**
     * Convenience: keep older callers working while we evolve behaviors.
     */
    setAvatarState(state) {
        this.setState(state);
    },

    /**
     * Apply simple animation when no animations in model
     */
    applySimpleAnimation(state) {
        if (!this.model) return;

        // Reset rotations
        this.model.rotation.z = 0;
        this.model.rotation.x = 0;

        switch (state) {
            case 'speaking':
                // Handled in render loop
                break;
            case 'thinking':
                this.model.rotation.z = 0.05;
                break;
            case 'listening':
                this.model.rotation.x = 0.03;
                break;
            default:
                break;
        }
    },

    /**
     * Apply visual effects based on state
     */
    applyStateEffects(state) {
        // Adjust lighting based on state
        if (this.lights.rim) {
            switch (state) {
                case 'speaking':
                    this.lights.rim.intensity = 1.5;
                    this.lights.rim.color.setHex(0xff6b9d);
                    break;
                case 'thinking':
                    this.lights.rim.intensity = 1.2;
                    this.lights.rim.color.setHex(0x64d8ff);
                    break;
                case 'listening':
                    this.lights.rim.intensity = 1.0;
                    this.lights.rim.color.setHex(0x9b6dff);
                    break;
                default:
                    this.lights.rim.intensity = 1.0;
                    this.lights.rim.color.setHex(0x64d8ff);
            }
        }
    },

    /**
     * Pick a new idle gesture occasionally to make the avatar feel alive.
     */
    scheduleNextIdleGesture(time) {
        // 3–8 seconds between gestures
        this.idleGesture.nextAt = time + 3 + Math.random() * 5;
    },

    /**
     * Compute gesture offsets (position/rotation) for the current gesture.
     */
    getGestureOffsets(time) {
        const g = this.idleGesture.current;
        if (!g) return { pos: new THREE.Vector3(0, 0, 0), rot: new THREE.Euler(0, 0, 0) };

        const t = (time - g.start) / g.duration;
        if (t >= 1) {
            this.idleGesture.current = null;
            this.scheduleNextIdleGesture(time);
            return { pos: new THREE.Vector3(0, 0, 0), rot: new THREE.Euler(0, 0, 0) };
        }

        // Smooth in/out envelope
        const ease = t < 0.2 ? (t / 0.2) : (t > 0.8 ? ((1 - t) / 0.2) : 1);
        const phase = t * Math.PI * 2;

        const pos = new THREE.Vector3(0, 0, 0);
        const rot = new THREE.Euler(0, 0, 0);

        switch (g.type) {
            case 'nod':
                rot.x = Math.sin(phase * 2) * 0.10 * ease;
                break;
            case 'tilt':
                rot.z = Math.sin(phase) * 0.10 * ease;
                break;
            case 'lookaway':
                rot.y = (Math.sin(phase) > 0 ? 1 : -1) * 0.25 * ease;
                break;
            case 'lean':
                pos.y = Math.sin(phase) * 0.03 * ease;
                rot.x = -0.06 * ease;
                break;
            default:
                break;
        }

        return { pos, rot };
    },

    /**
     * Update physics and animations each frame
     */
    updatePhysics(delta, time) {
        // === BLINKING SYSTEM ===
        this.updateBlinking(time);

        // === BREATHING ANIMATION (enhanced) ===
        const breathSpeed = this.currentAvatarState === 'speaking' ? 2.5 : 1.5;
        const breathDepth = this.currentAvatarState === 'thinking' ? 0.015 : 0.02;
        this.breathingOffset = Math.sin(time * breathSpeed) * breathDepth;
        if (this.model) {
            this.model.position.y += this.breathingOffset - (this.prevBreathingOffset || 0);
            this.prevBreathingOffset = this.breathingOffset;
        }

        // === MICRO-MOVEMENTS (natural idle sway) ===
        this.microMovement.noiseTime += delta;
        const noiseT = this.microMovement.noiseTime;

        // Perlin-like noise approximation using multiple sine waves
        const sway = Math.sin(noiseT * 0.7) * 0.3 +
            Math.sin(noiseT * 1.3) * 0.2 +
            Math.sin(noiseT * 2.1) * 0.1;
        this.microMovement.swayOffset = sway * 0.008;

        // Subtle head micro-tilt
        const headNoise = Math.sin(noiseT * 0.5) * 0.4 + Math.sin(noiseT * 1.1) * 0.3;
        this.microMovement.headTilt = headNoise * 0.015;

        // Shoulder micro-shift
        this.microMovement.shoulderShift = Math.sin(noiseT * 0.3) * 0.005;

        // === SPRING PHYSICS for mouse tracking ===
        if (this.model) {
            const targetX = this.mousePosition.x * 0.15;
            const targetY = this.mousePosition.y * 0.1;

            // Spring force calculation
            const forceX = (targetX - this.targetLookAt.x) * this.springPhysics.stiffness;
            const forceY = (targetY - this.targetLookAt.y) * this.springPhysics.stiffness;

            // Apply velocity with damping
            this.springPhysics.velocity.x = (this.springPhysics.velocity.x + forceX) * this.springPhysics.damping;
            this.springPhysics.velocity.y = (this.springPhysics.velocity.y + forceY) * this.springPhysics.damping;

            // Update position
            this.targetLookAt.x += this.springPhysics.velocity.x;
            this.targetLookAt.y += this.springPhysics.velocity.y;

            // Apply combined rotations with micro-movements
            this.model.rotation.y = this.targetLookAt.x + this.microMovement.swayOffset;
            this.model.rotation.x = this.targetLookAt.y * 0.5 + this.microMovement.headTilt;
            this.model.rotation.z = this.microMovement.shoulderShift;
        }

        // === ADVANCED BONE PHYSICS ===
        this.updateBonePhysics(time);

        // UPDATE DEBUG OVERLAY
        this.updateDebugOverlay(time);

        // Animate particles
        this.particles.forEach((particle) => {
            const { speed, amplitude, offset } = particle.userData;
            particle.position.y += Math.sin(time * speed + offset) * amplitude * delta;

            // Keep particles in bounds
            if (particle.position.y > this.config.roomSize.height) {
                particle.position.y = 0;
            }
            if (particle.position.y < 0) {
                particle.position.y = this.config.roomSize.height;
            }
        });

        // Animate floating orbs
        this.floatingOrbs.forEach((orb) => {
            const { baseY, speed, amplitude } = orb.userData;
            orb.position.y = baseY + Math.sin(time * speed) * amplitude;
            orb.rotation.y += delta * 0.5;
        });

        // Subtle camera sway for immersion
        if (this.camera) {
            this.camera.position.x = Math.sin(time * 0.3) * 0.05;
            this.camera.position.y = 1.5 + Math.sin(time * 0.2) * 0.03;
        }
    },

    /**
     * Update blinking animation
     */
    updateBlinking(time) {
        const blink = this.blinkState;

        // Check if it's time to blink
        if (!blink.isBlinking && time >= blink.nextBlinkTime) {
            blink.isBlinking = true;
            blink.blinkProgress = 0;

            // Vary blink speed slightly
            blink.blinkDuration = 0.12 + Math.random() * 0.06;
        }

        // Process blink animation
        if (blink.isBlinking) {
            blink.blinkProgress += 0.016 / blink.blinkDuration; // Approx 60fps

            if (blink.blinkProgress >= 1) {
                blink.isBlinking = false;

                // Schedule next blink (2-6 seconds, faster when thinking)
                const baseInterval = this.currentAvatarState === 'thinking' ? 1.5 : 3;
                const variation = this.currentAvatarState === 'thinking' ? 2 : 3;
                blink.nextBlinkTime = time + baseInterval + Math.random() * variation;

                // Chance for double blink
                if (Math.random() < blink.doubleBlinkChance) {
                    blink.nextBlinkTime = time + 0.2;
                }
            }

            // Apply blink to model (scale eyes or adjust material)
            this.applyBlinkToModel(blink.blinkProgress);
        }
    },

    /**
     * Apply blink effect to model
     */
    applyBlinkToModel(progress) {
        if (!this.model) return;

        // Blink curve: quick close, slower open
        let blinkAmount;
        if (progress < 0.4) {
            // Closing (fast)
            blinkAmount = progress / 0.4;
        } else {
            // Opening (slower)
            blinkAmount = 1 - ((progress - 0.4) / 0.6);
        }

        // Apply to model - try to find eye meshes or use scale
        this.model.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                if (name.includes('eye') || name.includes('lid') || name.includes('blink')) {
                    // Found eye-related mesh, scale Y to simulate blink
                    child.scale.y = 1 - (blinkAmount * 0.9);
                }
            }
        });

        // Fallback: subtle head movement during blink
        if (this.model && blinkAmount > 0.3) {
            this.model.rotation.x += blinkAmount * 0.02;
        }
    },


    /**
     * Show loading indicator
     */
    showLoadingIndicator(container) {
        const loader = document.createElement('div');
        loader.id = 'avatar3d-loader';
        loader.innerHTML = `
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                color: #9b6dff;
                font-size: 14px;
            ">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(155, 109, 255, 0.3);
                    border-top-color: #9b6dff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 10px;
                "></div>
                Loading 3D Room...
            </div>
        `;

        // Add spin animation
        if (!document.getElementById('avatar3d-styles')) {
            const style = document.createElement('style');
            style.id = 'avatar3d-styles';
            style.textContent = `
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(loader);
    },

    /**
     * Hide loading indicator
     */
    hideLoadingIndicator(container) {
        const loader = container.querySelector('#avatar3d-loader');
        if (loader) loader.remove();
    },

    /**
     * Hide fallback avatar
     */
    hideFallback(container) {
        const avatarCharacter = container.querySelector('.avatar-character');
        if (avatarCharacter) {
            avatarCharacter.style.display = 'none';
        }
    },

    /**
     * Show fallback when 3D fails
     */
    showFallback(container) {
        // Show the original CSS avatar
        const avatarCharacter = container.querySelector('.avatar-character');
        if (avatarCharacter) {
            avatarCharacter.style.display = 'block';
        }
        console.log('Falling back to CSS avatar');
    },

    /**
     * Set up resize handler
     */
    setupResizeHandler() {
        let resizeTimeout;

        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resize(), 100);
        });
    },

    /**
     * Resize the renderer and camera
     */
    resize() {
        const container = document.getElementById(this.config.containerId);
        if (!container || !this.renderer || !this.camera) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    },

    /**
     * Set up visibility observer to pause/resume rendering
     */
    setupVisibilityObserver(container) {
        if (!('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    this.resumeRendering();
                } else {
                    this.pauseRendering();
                }
            });
        }, { threshold: 0.1 });

        observer.observe(container);
    },

    /**
     * Start the render loop
     */
    startRenderLoop() {
        this.isRendering = true;
        this.render();
    },

    /**
     * Pause rendering
     */
    pauseRendering() {
        this.isRendering = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    },

    /**
     * Resume rendering
     */
    resumeRendering() {
        if (!this.isRendering) {
            this.isRendering = true;
            this.render();
        }
    },

    /**
     * Main render loop
     */
    render() {
        if (!this.isRendering) return;

        this.animationFrameId = requestAnimationFrame(() => this.render());

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // Update ocean background animation
        this.updateOceanBackground(time);

        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(delta);
        }

        // Update lifelike animations
        this.updateLifelikeAnimations(time, delta);

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    },

    /**
     * Update all lifelike animations - blinking, breathing, looking, swaying
     */
    updateLifelikeAnimations(time, delta) {
        if (!this.model) return;

        if (!this.basePose) {
            this.captureBasePose();
            // Make sure we don't spam gestures right at load.
            this.scheduleNextIdleGesture(time);
        }

        // If we have no running gesture and it's time, start one.
        if (!this.idleGesture.current && time >= this.idleGesture.nextAt) {
            const choices = ['nod', 'tilt', 'lookaway', 'lean'];
            const type = choices[Math.floor(Math.random() * choices.length)];
            this.idleGesture.current = {
                type,
                start: time,
                duration: 0.9 + Math.random() * 0.8
            };
        }

        // State-driven motion intensity
        const state = this.currentAvatarState || 'idle';
        const isSpeaking = state === 'speaking';
        const isThinking = state === 'thinking';

        // 1. Breathing animation (VISIBLE, but still subtle)
        const breathSpeed = isSpeaking ? 1.8 : (isThinking ? 1.0 : 1.25);
        const breathY = Math.sin(time * breathSpeed) * (isSpeaking ? 0.025 : 0.020);
        const breathScale = 1 + Math.sin(time * breathSpeed) * 0.010;
        this.breathingOffset = breathY;
        
        // 2. Idle sway (more noticeable than before)
        const sway = Math.sin(time * 0.65) * 0.03;
        const swayRoll = Math.sin(time * 0.90 + 0.7) * 0.02;
        const swayX = Math.sin(time * 0.55 + 1.2) * 0.02;
        
        // 3. Look at mouse with smooth interpolation
        const lookSpeed = 3.0;
        this.targetLookAt.x += (this.mousePosition.x * 0.15 - this.targetLookAt.x) * delta * lookSpeed;
        this.targetLookAt.y += (this.mousePosition.y * 0.08 - this.targetLookAt.y) * delta * lookSpeed;

        // 3.5. Idle gesture offsets
        const gesture = this.getGestureOffsets(time);

        // Apply pose from basePose every frame (no drift)
        const base = this.basePose;
        const lookYaw = this.targetLookAt.x * (isThinking ? 0.20 : 0.32);
        const lookPitch = -this.targetLookAt.y * (isThinking ? 0.06 : 0.10);

        this.model.position.set(
            base.position.x + swayX + gesture.pos.x,
            base.position.y + breathY + gesture.pos.y,
            base.position.z + gesture.pos.z
        );

        this.model.rotation.set(
            base.rotation.x + lookPitch + gesture.rot.x,
            base.rotation.y + lookYaw + sway + gesture.rot.y,
            base.rotation.z + swayRoll + gesture.rot.z
        );

        this.model.scale.set(
            base.scale.x * breathScale,
            base.scale.y * breathScale,
            base.scale.z * breathScale
        );

        // 4. Head tracking (if head bone found)
        if (this.bones.head) {
            this.bones.head.rotation.y = this.targetLookAt.x * 0.45;
            this.bones.head.rotation.x = -this.targetLookAt.y * 0.18;
        }

        // 5. Spine breathing movement
        if (this.bones.spine) {
            // breathingOffset is in meters now; keep this small
            this.bones.spine.rotation.x = Math.sin(time * breathSpeed) * 0.04;
        }

        // 6. Blinking animation
        this.updateBlinking(time);

        // 6.5. Speaking mouth movement (if we have suitable morph targets)
        if (isSpeaking) {
            const talk = (Math.sin(time * 9.0) * 0.5 + 0.5) * 0.75;
            this.applyMouthOpenMorph(talk);
        } else {
            this.applyMouthOpenMorph(0);
        }

        // 7. Random micro-movements for more life
        this.updateMicroMovements(time, delta);
    },

    /**
     * Apply mouth-open / jaw-open to morph targets if available.
     */
    applyMouthOpenMorph(value) {
        if (!this.morphTargets) return;

        const candidates = [
            'mouthopen', 'mouth_open', 'jawopen', 'jaw_open',
            'viseme_aa', 'viseme_ah', 'aa', 'ah',
            'vrc.v_aa', 'fcl_mth_a', 'fcl_mth_aa', 'fcl_mth_open'
        ];

        this.morphTargets.forEach(({ dictionary, influences }) => {
            for (const key of Object.keys(dictionary)) {
                const k = key.toLowerCase();
                if (candidates.some(c => k === c || k.includes(c))) {
                    influences[dictionary[key]] = value;
                }
            }
        });
    },

    /**
     * Update blinking animation
     */
    updateBlinking(time) {
        // Check if it's time to blink
        if (time >= this.blinkState.nextBlinkTime && !this.blinkState.isBlinking) {
            this.blinkState.isBlinking = true;
            this.blinkState.blinkProgress = 0;
            
            // Random interval for next blink (2-6 seconds)
            this.blinkState.nextBlinkTime = time + 2 + Math.random() * 4;
            
            // Chance for double blink
            if (Math.random() < this.blinkState.doubleBlinkChance) {
                this.blinkState.nextBlinkTime = time + 0.3;
            }
        }

        // Animate blink
        if (this.blinkState.isBlinking) {
            this.blinkState.blinkProgress += 0.1;
            
            // Blink curve: quick close, slower open
            const blinkValue = this.blinkState.blinkProgress < 0.5 
                ? this.blinkState.blinkProgress * 2 
                : (1 - this.blinkState.blinkProgress) * 2;
            
            // Apply to morph targets if available
            this.applyBlinkMorph(Math.max(0, Math.min(1, blinkValue)));
            
            if (this.blinkState.blinkProgress >= 1) {
                this.blinkState.isBlinking = false;
            }
        }
    },

    /**
     * Apply blink to morph targets
     */
    applyBlinkMorph(value) {
        if (!this.morphTargets) return;
        
        this.morphTargets.forEach(({ mesh, dictionary, influences }) => {
            // Try common blink morph target names
            const blinkNames = ['blink', 'Blink', 'eye_blink', 'EyeBlink', 'eyeBlinkLeft', 'eyeBlinkRight', 'Fcl_EYE_Close'];
            
            blinkNames.forEach(name => {
                if (dictionary[name] !== undefined) {
                    influences[dictionary[name]] = value;
                }
            });
        });
    },

    /**
     * Update random micro-movements
     */
    updateMicroMovements(time, delta) {
        // Subtle random head tilts
        this.microMovement.noiseTime += delta;
        
        const noise1 = Math.sin(time * 0.7) * Math.cos(time * 1.3);
        const noise2 = Math.sin(time * 0.5 + 1) * Math.cos(time * 0.9);
        
        if (this.bones.head) {
            this.bones.head.rotation.z = noise1 * 0.02; // Subtle head tilt
        }
        
        if (this.bones.neck) {
            this.bones.neck.rotation.z = noise2 * 0.01;
        }

        // Subtle shoulder movements
        if (this.bones.leftArm) {
            this.bones.leftArm.rotation.z = Math.sin(time * 0.3) * 0.02;
        }
        if (this.bones.rightArm) {
            this.bones.rightArm.rotation.z = Math.sin(time * 0.3 + Math.PI) * 0.02;
        }
    },

    /**
     * Set avatar emotional state
     */
    setEmotionalState(state) {
        this.currentEmotion = state;
        
        // Apply morph targets for expressions
        if (!this.morphTargets) return;
        
        // NOTE: Morph target names vary wildly across models.
        // We try a small, common set; if your model uses different names,
        // we'll detect them in console logs and can map accordingly.
        const expressions = {
            happy: { smile: 0.7 },
            sad: { frown: 0.5 },
            thinking: { browRaise: 0.35 },
            listening: { smile: 0.25 },
            idle: {}
        };
        
        const expr = expressions[state] || expressions.idle;
        
        this.morphTargets.forEach(({ mesh, dictionary, influences }) => {
            Object.keys(expr).forEach(morphName => {
                if (dictionary[morphName] !== undefined) {
                    influences[dictionary[morphName]] = expr[morphName];
                }
            });
        });
    },

    /**
     * Wave animation (greeting)
     */
    playWaveAnimation() {
        if (this.hasWaved) return;
        this.hasWaved = true;
        
        // Simple wave using right arm bone
        if (this.bones.rightArm) {
            const startRotation = this.bones.rightArm.rotation.z;
            let progress = 0;
            
            const animateWave = () => {
                progress += 0.05;
                const wave = Math.sin(progress * Math.PI * 4) * 0.3;
                this.bones.rightArm.rotation.z = startRotation - 1.2 + wave;
                this.bones.rightArm.rotation.x = -0.5;
                
                if (progress < 1.5) {
                    requestAnimationFrame(animateWave);
                } else {
                    // Return to normal
                    this.bones.rightArm.rotation.z = startRotation;
                    this.bones.rightArm.rotation.x = 0;
                    setTimeout(() => { this.hasWaved = false; }, 5000);
                }
            };
            animateWave();
        }
    },


    /**
     * Find standard humanoid bones
     */
    findBones(object) {
        console.log('Starting bone search on:', object);
        object.traverse((child) => {
            // Check all objects, not just bones (some GLTFs use Groups/Object3D)
            const name = child.name.toLowerCase();

            // Exclude meshes and lights to avoid rotating skin/geometry
            if (!child.isMesh && !child.isLight && !child.isCamera) {
                if (name.includes('hip') || name.includes('root') || name.includes('pelvis')) {
                    this.bones.hips = child;
                    console.log('Found HIPS:', child.name);
                }
                else if (name.includes('spine') && !name.includes('layer')) { // avoid duplicate spine layers
                    if (!this.bones.spine) {
                        this.bones.spine = child;
                        console.log('Found SPINE:', child.name);
                    }
                }
                else if (name.includes('head')) {
                    this.bones.head = child;
                    console.log('Found HEAD:', child.name);
                }
                else if (name.includes('neck')) {
                    this.bones.neck = child;
                    console.log('Found NECK:', child.name);
                }
                // Arms
                else if ((name.includes('arm') || name.includes('shoulder')) && name.includes('r') && !name.includes('fore')) {
                    this.bones.rightArm = child;
                    console.log('Found R-ARM:', child.name);
                }
                else if ((name.includes('arm') || name.includes('shoulder')) && name.includes('l') && !name.includes('fore')) {
                    this.bones.leftArm = child;
                    console.log('Found L-ARM:', child.name);
                }
                else if (name.includes('fore') && name.includes('r')) {
                    this.bones.rightForeArm = child;
                    console.log('Found R-FOREARM:', child.name);
                }
                else if (name.includes('fore') && name.includes('l')) {
                    this.bones.leftForeArm = child;
                    console.log('Found L-FOREARM:', child.name);
                }
            }
        });
        console.log('Bone mapping result:', this.bones);
    },

    /**
     * Update advanced bone physics (sway, gestures)
     */
    updateBonePhysics(time) {
        const { hips, spine, rightArm, leftArm, head, neck } = this.bones;

        // Debug first run only
        if (!this.hasLoggedPhysics && hips) {
            console.log('Physics update running. Hips found:', !!hips);
            this.hasLoggedPhysics = true;
        }

        // 1. HIP SWAY (Figure-8 motion)
        if (hips) {
            // Sway amount depends on state
            const swayAmp = this.currentAvatarState === 'idle' ? 0.05 : 0.02;
            const swaySpeed = 0.8;

            // Side-to-side (Sine)
            const swayX = Math.sin(time * swaySpeed) * swayAmp;
            // Back-and-forth (Cosine, half speed -> figure 8)
            const swayZ = Math.cos(time * swaySpeed * 0.5) * (swayAmp * 0.5);

            hips.rotation.z = swayX; // Hips roll/sway
            hips.rotation.x = swayZ; // Slight forward/back

            // 2. SPINE COMPENSATION (Counter-rotate)
            if (spine) {
                spine.rotation.z = -swayX * 0.6; // Keep upper body relatively upright
                spine.rotation.x = -swayZ * 0.6;
            }
        }

        // 3. PROCEDURAL ARM GESTURES (Talking)
        if (this.currentAvatarState === 'speaking') {
            const gestureSpeed = 3;
            // Noise-like movement using combined sines
            const noiseR = Math.sin(time * gestureSpeed) * 0.5 + Math.sin(time * gestureSpeed * 2.3) * 0.3;
            const noiseL = Math.sin(time * gestureSpeed * 1.1 + 1) * 0.5 + Math.sin(time * gestureSpeed * 2.7 + 2) * 0.3;

            if (rightArm) {
                rightArm.rotation.z = -0.5 + noiseR * 0.2; // Base pose + variation
                rightArm.rotation.x = noiseR * 0.3;
            }
            if (leftArm) {
                leftArm.rotation.z = 0.5 - noiseL * 0.2;
                leftArm.rotation.x = noiseL * 0.3;
            }
        } else {
            // Idle Arm Sway
            if (rightArm) {
                rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -1.2, 0.05); // Relaxed side
                rightArm.rotation.x = Math.sin(time * 1) * 0.05;
            }
            if (leftArm) {
                leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 1.2, 0.05);
                leftArm.rotation.x = Math.sin(time * 1.1) * 0.05;
            }
        }

        // 4. NECK/HEAD LEADING
        if (neck && this.targetLookAt) {
            neck.rotation.y = this.targetLookAt.x * 0.5;
            neck.rotation.x = this.targetLookAt.y * 0.3;
        }
    },

    /**
     * Create/Update Debug Overlay
     */
    updateDebugOverlay(time) {
        let overlay = document.getElementById('avatar-debug-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'avatar-debug-overlay';
            overlay.style.position = 'absolute';
            overlay.style.bottom = '10px';
            overlay.style.right = '10px';
            overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
            overlay.style.color = '#00ff00';
            overlay.style.padding = '10px';
            overlay.style.borderRadius = '5px';
            overlay.style.fontFamily = 'monospace';
            overlay.style.fontSize = '12px';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '9999';
            document.body.appendChild(overlay);
        }

        const boneStatus = {
            hips: !!this.bones.hips,
            spine: !!this.bones.spine,
            arms: !!(this.bones.rightArm && this.bones.leftArm)
        };

        const sway = this.microMovement.swayOffset.toFixed(4);
        const blink = this.blinkState.isBlinking ? 'YES' : 'NO';

        overlay.innerHTML = `
            <strong>Avatar Debug</strong><br>
            State: ${this.currentAvatarState}<br>
            Bones Found: Hips:${boneStatus.hips ? '✅' : '❌'} Spine:${boneStatus.spine ? '✅' : '❌'} Arms:${boneStatus.arms ? '✅' : '❌'}<br>
            Blink: ${blink}<br>
            Sway: ${sway}<br>
            Time: ${time.toFixed(1)}
        `;
    },

    /**
     * Clean up resources
     */
    dispose() {
        this.pauseRendering();

        if (this.renderer) {
            this.renderer.dispose();
            const container = document.getElementById(this.config.containerId);
            if (container && this.renderer.domElement.parentNode === container) {
                container.removeChild(this.renderer.domElement);
            }
        }

        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.model = null;
        this.mixer = null;
        this.particles = [];
        this.floatingOrbs = [];
    }
};

// Export for use in app.js
window.Avatar3D = Avatar3D;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Avatar3D.init('avatar');
});

export default Avatar3D;
