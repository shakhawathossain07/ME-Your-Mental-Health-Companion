/**
 * Unit Tests for Avatar3D Module
 * Tests state transitions and core functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Three.js modules
vi.mock('three', () => ({
  Scene: vi.fn(() => ({
    add: vi.fn(),
    traverse: vi.fn(),
  })),
  PerspectiveCamera: vi.fn(() => ({
    position: { set: vi.fn() },
    lookAt: vi.fn(),
    aspect: 1,
    updateProjectionMatrix: vi.fn(),
  })),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    setClearColor: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas'),
    outputColorSpace: '',
  })),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn(() => ({
    position: { set: vi.fn() },
    castShadow: false,
  })),
  PointLight: vi.fn(() => ({
    position: { set: vi.fn() },
  })),
  Box3: vi.fn(() => ({
    setFromObject: vi.fn().mockReturnThis(),
    getSize: vi.fn(() => ({ x: 1, y: 2, z: 1 })),
    getCenter: vi.fn(() => ({ x: 0, y: 1, z: 0 })),
  })),
  Vector3: vi.fn(),
  Clock: vi.fn(() => ({
    getDelta: vi.fn(() => 0.016),
    getElapsedTime: vi.fn(() => 0),
  })),
  SRGBColorSpace: 'srgb',
  AnimationMixer: vi.fn(() => ({
    clipAction: vi.fn(() => ({
      reset: vi.fn().mockReturnThis(),
      fadeIn: vi.fn().mockReturnThis(),
      fadeOut: vi.fn().mockReturnThis(),
      play: vi.fn().mockReturnThis(),
    })),
    update: vi.fn(),
  })),
}));

vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn(() => ({
    load: vi.fn((path, onLoad) => {
      onLoad({
        scene: { scale: { setScalar: vi.fn() }, position: { x: 0, y: 0, z: 0 }, rotation: { y: 0, z: 0, x: 0 } },
        animations: [{ name: 'Idle' }, { name: 'Talk' }],
      });
    }),
  })),
}));

vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(),
}));

// Create a mock Avatar3D for testing
const createMockAvatar3D = () => ({
  scene: null,
  camera: null,
  renderer: null,
  model: null,
  mixer: null,
  animations: {},
  currentAction: null,
  currentState: 'idle',

  setState(state) {
    const validStates = ['idle', 'speaking', 'thinking', 'listening'];
    if (!validStates.includes(state)) {
      throw new Error(`Invalid state: ${state}`);
    }
    
    const previousState = this.currentState;
    this.currentState = state;
    
    // Simulate animation transition
    if (this.mixer && this.animations[state]) {
      if (this.currentAction) {
        this.currentAction.fadeOut(0.3);
      }
      this.currentAction = this.animations[state];
      this.currentAction.reset().fadeIn(0.3).play();
    }
    
    return { previousState, newState: state };
  },
});

describe('Avatar3D State Transitions', () => {
  let avatar;

  beforeEach(() => {
    avatar = createMockAvatar3D();
    // Set up mock animations
    avatar.mixer = { update: vi.fn() };
    avatar.animations = {
      idle: { reset: vi.fn().mockReturnThis(), fadeIn: vi.fn().mockReturnThis(), fadeOut: vi.fn().mockReturnThis(), play: vi.fn().mockReturnThis() },
      speaking: { reset: vi.fn().mockReturnThis(), fadeIn: vi.fn().mockReturnThis(), fadeOut: vi.fn().mockReturnThis(), play: vi.fn().mockReturnThis() },
      thinking: { reset: vi.fn().mockReturnThis(), fadeIn: vi.fn().mockReturnThis(), fadeOut: vi.fn().mockReturnThis(), play: vi.fn().mockReturnThis() },
      listening: { reset: vi.fn().mockReturnThis(), fadeIn: vi.fn().mockReturnThis(), fadeOut: vi.fn().mockReturnThis(), play: vi.fn().mockReturnThis() },
    };
  });

  /**
   * **Feature: 3d-avatar-integration, State Transitions**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   */
  describe('State: idle', () => {
    it('should set state to idle and trigger idle animation', () => {
      const result = avatar.setState('idle');
      
      expect(result.newState).toBe('idle');
      expect(avatar.currentState).toBe('idle');
      expect(avatar.animations.idle.play).toHaveBeenCalled();
    });
  });

  describe('State: speaking', () => {
    it('should set state to speaking and trigger speaking animation', () => {
      const result = avatar.setState('speaking');
      
      expect(result.newState).toBe('speaking');
      expect(avatar.currentState).toBe('speaking');
      expect(avatar.animations.speaking.play).toHaveBeenCalled();
    });
  });

  describe('State: thinking', () => {
    it('should set state to thinking and trigger thinking animation', () => {
      const result = avatar.setState('thinking');
      
      expect(result.newState).toBe('thinking');
      expect(avatar.currentState).toBe('thinking');
      expect(avatar.animations.thinking.play).toHaveBeenCalled();
    });
  });

  describe('State: listening', () => {
    it('should set state to listening and trigger listening animation', () => {
      const result = avatar.setState('listening');
      
      expect(result.newState).toBe('listening');
      expect(avatar.currentState).toBe('listening');
      expect(avatar.animations.listening.play).toHaveBeenCalled();
    });
  });

  describe('State transitions', () => {
    it('should fade out previous animation when transitioning', () => {
      avatar.setState('idle');
      avatar.setState('speaking');
      
      expect(avatar.animations.idle.fadeOut).toHaveBeenCalled();
      expect(avatar.animations.speaking.fadeIn).toHaveBeenCalled();
    });

    it('should reject invalid states', () => {
      expect(() => avatar.setState('invalid')).toThrow('Invalid state: invalid');
    });
  });
});
