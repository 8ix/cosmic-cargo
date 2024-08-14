import { System, StateModule } from '../GameEngine';
import Logger from '../Logger';
import { GameState } from '../GameState';
import { Trader, Good, Location, InventoryItem } from '../types';
import { loadJSONFile } from '../fileLoader';
import { EconomySystem } from './EconomySystem';

interface TraderInventory {
  [traderId: string]: InventoryItem[];
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
  private economySystem: EconomySystem;

  constructor(gameState: GameState, economySystem: EconomySystem) {
    this.state = new TraderStateModule();
    this.gameState = gameState;
    this.economySystem = economySystem;
  }

  initialize(): void {
    Logger.log('Initializing TraderSystem', 'INFO');
    this.loadTraders();
    this.loadGoods();
    this.loadLocations();
    this.generateInitialInventories();
  }

  update(): void {
    // Implement logic for updating trader inventories based on restockFrequency
    this.state.traders.forEach(trader => {
      if (Math.random() < 1 / trader.restockFrequency) {
        this.restockTrader(trader);
      }
    });
  }

  getStateModule(): StateModule {
    return this.state;
  }

  private loadTraders(): void {
    try {
      this.state.traders = loadJSONFile<Trader[]>('traders.json');
      Logger.log(`Loaded ${this.state.traders.length} traders`, 'INFO');
    } catch (error) {
      Logger.error(`Failed to load traders: ${error}`);
    }
  }

  private loadGoods(): void {
    try {
      this.goods = loadJSONFile<Good[]>('goods.json');
      Logger.log(`Loaded ${this.goods.length} goods`, 'INFO');
    } catch (error) {
      Logger.error(`Failed to load goods: ${error}`);
    }
  }

  private loadLocations(): void {
    try {
      this.locations = loadJSONFile<Location[]>('locations.json');
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

  private generateInventory(trader: Trader, location: Location): InventoryItem[] {
    const inventory: InventoryItem[] = [];
    let remainingSpace = trader.inventorySize;

    for (const good of this.goods) {
      const stockProbability = this.calculateStockProbability(good, trader, location);
      if (Math.random() < stockProbability) {
        const maxQuantity = Math.floor(remainingSpace / good.weight);
        const quantity = Math.floor(Math.random() * maxQuantity * (1 - good.rarity)) + 1;
        const price = this.economySystem.getPrice(good.id, location.id);
        inventory.push({ goodId: good.id, quantity, price });
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

  getTraderInventory(traderId: string): InventoryItem[] | null {
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

  private restockTrader(trader: Trader): void {
    const location = this.locations.find(loc => loc.id === trader.location);
    if (location) {
      this.state.inventories[trader.id] = this.generateInventory(trader, location);
      Logger.log(`Restocked inventory for trader ${trader.id}`, 'INFO');
    } else {
      Logger.error(`Location not found for trader ${trader.id} during restock`);
    }
  }

  buyFromTrader(traderId: string, goodId: string, quantity: number): number | null {
    const traderInventory = this.state.inventories[traderId];
    const item = traderInventory?.find(item => item.goodId === goodId);

    if (!item || item.quantity < quantity) {
      Logger.warn(`Insufficient quantity of ${goodId} available from trader ${traderId}`);
      return null;
    }

    const totalCost = item.price * quantity;
    item.quantity -= quantity;

    if (item.quantity === 0) {
      this.state.inventories[traderId] = traderInventory.filter(i => i.goodId !== goodId);
    }

    Logger.log(`Sold ${quantity} of ${goodId} to player for ${totalCost} credits`, 'INFO');
    return totalCost;
  }

  sellToTrader(traderId: string, goodId: string, quantity: number, playerPrice: number): boolean {
    const trader = this.state.traders.find(t => t.id === traderId);
    if (!trader) {
      Logger.error(`Trader not found: ${traderId}`);
      return false;
    }

    const location = this.locations.find(loc => loc.id === trader.location);
    if (!location) {
      Logger.error(`Location not found for trader ${traderId}`);
      return false;
    }

    const marketPrice = this.economySystem.getPrice(goodId, location.id);
    if (playerPrice > marketPrice * 1.2) {  // Allow up to 20% markup
      Logger.warn(`Price too high for trader ${traderId} to buy ${goodId}`);
      return false;
    }

    const traderInventory = this.state.inventories[traderId];
    const existingItem = traderInventory.find(item => item.goodId === goodId);

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.price = (existingItem.price * existingItem.quantity + playerPrice * quantity) / (existingItem.quantity + quantity);
    } else {
      traderInventory.push({ goodId, quantity, price: playerPrice });
    }

    Logger.log(`Bought ${quantity} of ${goodId} from player for ${playerPrice * quantity} credits`, 'INFO');
    return true;
  }
}