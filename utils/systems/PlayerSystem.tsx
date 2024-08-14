import { System, StateModule } from '../GameEngine';
import Logger from '../Logger';
import { GameState } from '../GameState';
import { Ship, InventoryItem } from '../types';
import { InventorySystem } from './InventorySystem';
import { ShipSystem } from './ShipSystem';

class PlayerStateModule implements StateModule {
    name: string = '';
    credits: number = 0;

    serialize(): any {
        return {
            name: this.name,
            credits: this.credits
        };
    }

    deserialize(data: any): void {
        this.name = data.name;
        this.credits = data.credits;
    }
}

export class PlayerSystem implements System {
    private state: PlayerStateModule;
    private gameState: GameState;
    private inventorySystem: InventorySystem;
    private shipSystem: ShipSystem;

    constructor(gameState: GameState, inventorySystem: InventorySystem, shipSystem: ShipSystem) {
        this.state = new PlayerStateModule();
        this.gameState = gameState;
        this.inventorySystem = inventorySystem;
        this.shipSystem = shipSystem;
    }

    initialize(): void {
        Logger.log('Initializing PlayerSystem', 'INFO');
        // You could load initial player data here if needed
    }

    getStateModule(): StateModule {
        return this.state;
    }

    setPlayerName(name: string): void {
        this.state.name = name;
        Logger.log(`Player name set to ${name}`, 'INFO');
    }

    getPlayerName(): string {
        return this.state.name;
    }

    getCredits(): number {
        return this.state.credits;
    }

    addCredits(amount: number): void {
        this.state.credits += amount;
        Logger.log(`Added ${amount} credits. New balance: ${this.state.credits}`, 'INFO');
    }

    removeCredits(amount: number): boolean {
        if (this.state.credits >= amount) {
            this.state.credits -= amount;
            Logger.log(`Removed ${amount} credits. New balance: ${this.state.credits}`, 'INFO');
            return true;
        } else {
            Logger.log(`Insufficient credits. Required: ${amount}, Available: ${this.state.credits}`, 'WARN');
            return false;
        }
    }

    getShip(): Ship {
        return this.shipSystem.getShipInfo();
    }

    upgradeShip(upgradeId: string): boolean {
        return this.shipSystem.applyUpgrade(upgradeId);
    }

    getInventory(): InventoryItem[] {
        return this.inventorySystem.getInventory();
    }

    addToInventory(goodId: string, quantity: number): boolean {
        return this.inventorySystem.addItem(goodId, quantity);
    }

    removeFromInventory(goodId: string, quantity: number): boolean {
        return this.inventorySystem.removeItem(goodId, quantity);
    }

    getCurrentCargoLoad(): number {
        return this.shipSystem.getCurrentCargoLoad();
    }

    getRemainingCargoCapacity(): number {
        return this.shipSystem.getRemainingCargoCapacity();
    }

    getFuelLevel(): number {
        return this.shipSystem.getFuelLevel();
    }

    refuel(amount: number): number {
        return this.shipSystem.refuel(amount);
    }

    travel(distance: number): boolean {
        return this.shipSystem.travel(distance);
    }
}