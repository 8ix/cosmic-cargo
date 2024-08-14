import { System, StateModule } from '../GameEngine';
import Logger from '../Logger';
import { GameState } from '../GameState';

interface PlayerShip {
    name: string;
    cargoCapacity: number;
    fuelCapacity: number;
    speed: number;
}

interface InventoryItem {
    goodId: string;
    quantity: number;
}

class PlayerStateModule implements StateModule {
    name: string = '';
    credits: number = 0;
    ship: PlayerShip = {
        name: 'Starter Ship',
        cargoCapacity: 100,
        fuelCapacity: 100,
        speed: 1
    };
    inventory: InventoryItem[] = [];
    currentFuel: number = 100;

    serialize(): any {
        return {
            name: this.name,
            credits: this.credits,
            ship: this.ship,
            inventory: this.inventory,
            currentFuel: this.currentFuel
        };
    }

    deserialize(data: any): void {
        this.name = data.name;
        this.credits = data.credits;
        this.ship = data.ship;
        this.inventory = data.inventory;
        this.currentFuel = data.currentFuel;
    }
}

export class PlayerSystem implements System {
    private state: PlayerStateModule;
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.state = new PlayerStateModule();
        this.gameState = gameState;
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

    getShip(): PlayerShip {
        return this.state.ship;
    }

    upgradeShip(upgrades: Partial<PlayerShip>): void {
        Object.assign(this.state.ship, upgrades);
        Logger.log(`Ship upgraded. New stats: ${JSON.stringify(this.state.ship)}`, 'INFO');
    }

    getInventory(): InventoryItem[] {
        return this.state.inventory;
    }

    addToInventory(goodId: string, quantity: number): boolean {
        const currentCargo = this.getCurrentCargoLoad();
        if (currentCargo + quantity > this.state.ship.cargoCapacity) {
            Logger.log(`Cannot add ${quantity} of ${goodId}. Exceeds cargo capacity.`, 'WARN');
            return false;
        }

        const existingItem = this.state.inventory.find(item => item.goodId === goodId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.state.inventory.push({ goodId, quantity });
        }
        Logger.log(`Added ${quantity} of ${goodId} to inventory`, 'INFO');
        return true;
    }

    removeFromInventory(goodId: string, quantity: number): boolean {
        const existingItem = this.state.inventory.find(item => item.goodId === goodId);
        if (!existingItem || existingItem.quantity < quantity) {
            Logger.log(`Cannot remove ${quantity} of ${goodId} from inventory. Insufficient quantity.`, 'WARN');
            return false;
        }

        existingItem.quantity -= quantity;
        if (existingItem.quantity === 0) {
            this.state.inventory = this.state.inventory.filter(item => item.goodId !== goodId);
        }
        Logger.log(`Removed ${quantity} of ${goodId} from inventory`, 'INFO');
        return true;
    }

    getCurrentCargoLoad(): number {
        return this.state.inventory.reduce((total, item) => total + item.quantity, 0);
    }

    getFuelLevel(): number {
        return this.state.currentFuel;
    }

    consumeFuel(amount: number): boolean {
        if (this.state.currentFuel >= amount) {
            this.state.currentFuel -= amount;
            Logger.log(`Consumed ${amount} fuel. Remaining: ${this.state.currentFuel}`, 'INFO');
            return true;
        } else {
            Logger.log(`Insufficient fuel. Required: ${amount}, Available: ${this.state.currentFuel}`, 'WARN');
            return false;
        }
    }

    refuel(amount: number): void {
        const maxRefuel = this.state.ship.fuelCapacity - this.state.currentFuel;
        const actualRefuel = Math.min(amount, maxRefuel);
        this.state.currentFuel += actualRefuel;
        Logger.log(`Refueled ${actualRefuel}. Current fuel: ${this.state.currentFuel}`, 'INFO');
    }
}