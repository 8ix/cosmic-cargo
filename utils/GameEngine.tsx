import Logger from './Logger';
import { GameState } from './GameState';

export interface StateModule {
  serialize(): any;
  deserialize(data: any): void;
}

export interface System {
  initialize?(): void;
  update?(): void;
  getStateModule?(): StateModule;
}

type EventCallback = (...args: any[]) => void;

export class GameEngine {
  state: GameState;
  private systems: { [key: string]: System } = {};
  private isRunning: boolean = false;
  private eventListeners: { [key: string]: EventCallback[] } = {};

  constructor(private dependencies: { [key: string]: any }) {
    this.state = new GameState();
  }

  registerSystem(name: string, system: System) {
    this.systems[name] = system;
    if (system.getStateModule) {
      const stateModule = system.getStateModule();
      this.state.registerModule(name, stateModule);
    }
    Logger.log(`Registered system: ${name}`, 'INFO');
  }

  initialize() {
    Logger.log('Initializing game', 'INFO');
    Object.values(this.systems).forEach(system => {
      if (system.initialize) {
        system.initialize();
      }
    });
    this.isRunning = true;
    Logger.log('Game initialized', 'INFO');
  }

  update() {
    if (!this.isRunning) return;
    Logger.log('Updating game state', 'INFO');
    Object.values(this.systems).forEach(system => {
      if (system.update) {
        system.update();
      }
    });
  }

  saveGame(): string {
    Logger.log('Saving game', 'INFO');
    return this.state.serialize();
  }

  loadGame(savedState: string) {
    Logger.log('Loading game', 'INFO');
    this.state.deserialize(savedState);
    this.initialize(); // Re-initialize systems with loaded state
  }

  getSystem<T extends System>(name: string): T {
    return this.systems[name] as T;
  }

  getDependency<T>(name: string): T {
    return this.dependencies[name] as T;
  }

  startGame() {
    this.isRunning = true;
    Logger.log('Game started', 'INFO');
    this.emit('gameStarted');
  }

  pauseGame() {
    this.isRunning = false;
    Logger.log('Game paused', 'INFO');
    this.emit('gamePaused');
  }

  endGame() {
    this.isRunning = false;
    Logger.log('Game ended', 'INFO');
    this.emit('gameEnded');
  }

  on(eventName: string, callback: EventCallback) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(callback);
  }

  off(eventName: string, callback: EventCallback) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName] = this.eventListeners[eventName].filter(cb => cb !== callback);
    }
  }

  emit(eventName: string, ...args: any[]) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach(callback => callback(...args));
    }
  }
}