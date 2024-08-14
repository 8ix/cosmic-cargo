import { System, StateModule } from '../GameEngine';
import Logger from '../Logger';
import { GameState } from '../GameState';
import fs from 'fs';
import path from 'path';

interface Trader {
  id: string;
  name: string;
  species: string;
  location: string;
  specialization: string;
  reputation: number;
  inventorySize: number;
  restockFrequency: number;
}

interface Good {
  id: string;
  name: string;
  basePrice: number;
  weight: number;
  lifespan: number | null;
  contraband: boolean;
  rarity: number;
  traderAffinity: { [key: string]: number };
}

interface Location {
  id: string;
  name: string;
  coordinates: { x: number; y: number; z: number };
  description: string;
  dominantSpecies: string;
  economyType: string;
  securityLevel: string;
}

interface TraderInventory {
  [traderId: string]: { goodId: string; quantity: number }[];
}

class TraderStateModule implements StateModule {
    traders: Trader[] = [];
    inventories: TraderInventory = {};
  
    serialize(): any {
      return {
        traders: this.traders,
        inventories: this.inventories,
      };
    }
  
    deserialize(data: any): void {
      this.traders = data.traders;
      this.inventories = data.inventories;
    }
  }
export class TraderSystem implements System {
  private state: TraderStateModule;
  private gameState: GameState;
  private goods: Good[] = [];
  private locations: Location[] = [];

  constructor(gameState: GameState) {
    this.state = new TraderStateModule();
    this.gameState = gameState;
  }

  initialize(): void {
    Logger.log('Initializing TraderSystem', 'INFO');
    this.loadTraders();
    this.loadGoods();
    this.loadLocations();
    this.generateInitialInventories();
  }

  update(): void {
    // Here we could implement logic for updating trader inventories based on restockFrequency
    // This method would be called regularly by the game loop
  }

  getStateModule(): StateModule {
    return this.state;
  }

  private loadTraders(): void {
    try {
      const data = fs.readFileSync(path.join(process.cwd(), 'content', 'traders.json'), 'utf8');
      this.state.traders = JSON.parse(data);
      Logger.log(`Loaded ${this.state.traders.length} traders`, 'INFO');
    } catch (error) {
      Logger.error(`Failed to load traders: ${error}`);
    }
  }

  private loadGoods(): void {
    try {
      const data = fs.readFileSync(path.join(process.cwd(), 'content', 'goods.json'), 'utf8');
      this.goods = JSON.parse(data);
      Logger.log(`Loaded ${this.goods.length} goods`, 'INFO');
    } catch (error) {
      Logger.error(`Failed to load goods: ${error}`);
    }
  }

  private loadLocations(): void {
    try {
      const data = fs.readFileSync(path.join(process.cwd(), 'content', 'locations.json'), 'utf8');
      this.locations = JSON.parse(data);
      Logger.log(`Loaded ${this.locations.length} locations`, 'INFO');
    } catch (error) {
      Logger.error(`Failed to load locations: ${error}`);
    }
  }

  private generateInitialInventories(): void {
    for (const trader of this.state.traders) {
      const location = this.locations.find(loc => loc.id === trader.location);
      if (location) {
        this.state.inventories[trader.id] = this.generateInventory(trader, location);
      } else {
        Logger.error(`Location not found for trader ${trader.id}`);
      }
    }
  }

  private generateInventory(trader: Trader, location: Location): { goodId: string; quantity: number }[] {
    const inventory: { goodId: string; quantity: number }[] = [];
    let remainingSpace = trader.inventorySize;

    for (const good of this.goods) {
      const stockProbability = this.calculateStockProbability(good, trader, location);
      if (Math.random() < stockProbability) {
        const maxQuantity = Math.floor(remainingSpace / good.weight);
        const quantity = Math.floor(Math.random() * maxQuantity * (1 - good.rarity)) + 1;
        inventory.push({ goodId: good.id, quantity });
        remainingSpace -= quantity * good.weight;
      }
      if (remainingSpace <= 0) break;
    }

    return inventory;
  }

  private calculateStockProbability(good: Good, trader: Trader, location: Location): number {
    let probability = good.traderAffinity[trader.specialization] || 0.1;
    probability *= (1 - good.rarity);
    
    if (location.economyType === 'industrial' && good.id.startsWith('FUEL')) {
      probability *= 1.5;
    }
    
    if (good.contraband && location.securityLevel === 'high') {
      probability *= 0.1;
    }

    return Math.min(probability, 1);
  }

  getTraderInventory(traderId: string): { goodId: string; quantity: number }[] | null {
    return this.state.inventories[traderId] || null;
  }

  updateTraderLocation(traderId: string, newLocationId: string): void {
    const trader = this.state.traders.find(t => t.id === traderId);
    if (trader) {
      trader.location = newLocationId;
      const location = this.locations.find(loc => loc.id === newLocationId);
      if (location) {
        this.state.inventories[traderId] = this.generateInventory(trader, location);
      } else {
        Logger.error(`Location not found: ${newLocationId}`);
      }
    } else {
      Logger.error(`Trader not found: ${traderId}`);
    }
  }
}