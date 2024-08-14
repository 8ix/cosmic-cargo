import { System, StateModule } from '../GameEngine';
import Logger from '../Logger';
import { GameState } from '../GameState';
import { InventoryItem, Good } from '../types';
import { loadJSONFile } from '../fileLoader';

class InventoryStateModule implements StateModule {
    items: InventoryItem[] = [];

    serialize(): any {
        return {
            items: this.items
        };
    }

    deserialize(data: any): void {
        this.items = data.items;
    }
}

export class InventorySystem implements System {
    private state: InventoryStateModule;
    private gameState: GameState;
    private goodsData: { [key: string]: Good };

    constructor(gameState: GameState) {
        this.state = new InventoryStateModule();
        this.gameState = gameState;
        this.goodsData = this.loadGoodsData();
    }

    initialize(): void {
        Logger.log('Initializing InventorySystem', 'INFO');
    }

    getStateModule(): StateModule {
        return this.state;
    }

    private loadGoodsData(): { [key: string]: Good } {
        const goods: Good[] = loadJSONFile<Good[]>('goods.json');
        return goods.reduce((acc: { [key: string]: Good }, good: Good) => {
            acc[good.id] = good;
            return acc;
        }, {});
    }

    addItem(itemId: string, quantity: number): boolean {
        if (!this.goodsData[itemId]) {
            Logger.log(`Invalid item ID: ${itemId}`, 'ERROR');
            return false;
        }

        const existingItem = this.state.items.find(item => item.goodId === itemId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.state.items.push({
                goodId: itemId,
                quantity: quantity
            });
        }

        Logger.log(`Added ${quantity} of ${this.goodsData[itemId].name} to inventory`, 'INFO');
        return true;
    }

    removeItem(itemId: string, quantity: number): boolean {
        const existingItem = this.state.items.find(item => item.goodId === itemId);
        if (!existingItem || existingItem.quantity < quantity) {
            Logger.log(`Cannot remove ${quantity} of ${itemId} from inventory. Insufficient quantity.`, 'WARN');
            return false;
        }

        existingItem.quantity -= quantity;
        if (existingItem.quantity === 0) {
            this.state.items = this.state.items.filter(item => item.goodId !== itemId);
        }

        Logger.log(`Removed ${quantity} of ${this.goodsData[itemId].name} from inventory`, 'INFO');
        return true;
    }

    getInventory(): InventoryItem[] {
        return [...this.state.items];
    }

    getTotalWeight(): number {
        return this.state.items.reduce((total, item) => total + item.quantity * this.goodsData[item.goodId].weight, 0);
    }

    getItemQuantity(itemId: string): number {
        const item = this.state.items.find(item => item.goodId === itemId);
        return item ? item.quantity : 0;
    }

    clearInventory(): void {
        this.state.items = [];
        Logger.log('Inventory cleared', 'INFO');
    }
}