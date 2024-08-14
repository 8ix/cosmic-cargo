import { System, StateModule } from '../GameEngine';
import Logger from '../Logger';
import { GameState } from '../GameState';
import fs from 'fs';
import path from 'path';
import { InventorySystem } from './InventorySystem';

interface Ship {
    name: string;
    model: string;
    cargoCapacity: number;
    fuelCapacity: number;
    fuelEfficiency: number;
    speed: number;
    health: number;
    maxHealth: number;
}

type ShipProperty = keyof Omit<Ship, 'name' | 'model'>;

interface ShipUpgrade {
    id: string;
    name: string;
    description: string;
    cost: number;
    effect: Partial<Record<ShipProperty, number>>;
}
class ShipStateModule implements StateModule {
    ship: Ship;
    currentFuel: number;
    upgrades: string[] = [];

    constructor() {
        this.ship = this.loadInitialShipData();
        this.currentFuel = this.ship.fuelCapacity;
    }

    private loadInitialShipData(): Ship {
        const data = fs.readFileSync(path.join(process.cwd(), 'content', 'initial-ship.json'), 'utf8');
        return JSON.parse(data);
    }

    serialize(): any {
        return {
            ship: this.ship,
            currentFuel: this.currentFuel,
            upgrades: this.upgrades
        };
    }

    deserialize(data: any): void {
        this.ship = data.ship;
        this.currentFuel = data.currentFuel;
        this.upgrades = data.upgrades;
    }
}

export class ShipSystem implements System {
    private state: ShipStateModule;
    private gameState: GameState;
    private availableUpgrades: ShipUpgrade[];
    private inventorySystem: InventorySystem;

    constructor(gameState: GameState, inventorySystem: InventorySystem) {
        this.state = new ShipStateModule();
        this.gameState = gameState;
        this.availableUpgrades = this.loadUpgrades();
        this.inventorySystem = inventorySystem;
    }

    initialize(): void {
        Logger.log('Initializing ShipSystem', 'INFO');
    }

    getStateModule(): StateModule {
        return this.state;
    }

    private loadUpgrades(): ShipUpgrade[] {
        const data = fs.readFileSync(path.join(process.cwd(), 'content', 'ship-upgrades.json'), 'utf8');
        return JSON.parse(data);
    }

    getShipInfo(): Ship {
        return { ...this.state.ship };
    }

    setShipName(name: string): void {
        this.state.ship.name = name;
        Logger.log(`Ship name set to ${name}`, 'INFO');
    }

    getFuelLevel(): number {
        return this.state.currentFuel;
    }

    refuel(amount: number): number {
        const maxRefuel = this.state.ship.fuelCapacity - this.state.currentFuel;
        const actualRefuel = Math.min(amount, maxRefuel);
        this.state.currentFuel += actualRefuel;
        Logger.log(`Refueled ${actualRefuel}. Current fuel: ${this.state.currentFuel}`, 'INFO');
        return actualRefuel;
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

    travel(distance: number): boolean {
        const fuelRequired = distance / this.state.ship.fuelEfficiency;
        if (this.consumeFuel(fuelRequired)) {
            Logger.log(`Traveled ${distance} units`, 'INFO');
            return true;
        }
        return false;
    }

    repair(amount: number): number {
        const maxRepair = this.state.ship.maxHealth - this.state.ship.health;
        const actualRepair = Math.min(amount, maxRepair);
        this.state.ship.health += actualRepair;
        Logger.log(`Repaired ${actualRepair}. Current health: ${this.state.ship.health}`, 'INFO');
        return actualRepair;
    }

    takeDamage(amount: number): void {
        this.state.ship.health = Math.max(0, this.state.ship.health - amount);
        Logger.log(`Took ${amount} damage. Current health: ${this.state.ship.health}`, 'INFO');
    }

    getAvailableUpgrades(): ShipUpgrade[] {
        return this.availableUpgrades.filter(upgrade => !this.state.upgrades.includes(upgrade.id));
    }

    applyUpgrade(upgradeId: string): boolean {
        const upgrade = this.availableUpgrades.find(u => u.id === upgradeId);
        if (!upgrade) {
            Logger.log(`Upgrade ${upgradeId} not found`, 'ERROR');
            return false;
        }

        if (this.state.upgrades.includes(upgradeId)) {
            Logger.log(`Upgrade ${upgradeId} already applied`, 'WARN');
            return false;
        }

        // Apply the upgrade effects
        (Object.entries(upgrade.effect) as [ShipProperty, number][]).forEach(([key, value]) => {
            if (key in this.state.ship && typeof this.state.ship[key] === 'number') {
                (this.state.ship[key] as number) += value;
            }
        });

        this.state.upgrades.push(upgradeId);
        Logger.log(`Applied upgrade: ${upgrade.name}`, 'INFO');
        return true;
    }

    getCurrentCargoLoad(): number {
        return this.inventorySystem.getTotalWeight();
    }

    getRemainingCargoCapacity(): number {
        return this.state.ship.cargoCapacity - this.getCurrentCargoLoad();
    }
}