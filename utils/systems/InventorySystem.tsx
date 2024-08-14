import { System, StateModule } from '../GameEngine';
import Logger from '../Logger';
import { GameState } from '../GameState';
import fs from 'fs';
import path from 'path';

interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    weight: number;
}

interface GoodData {
    id: string;
    name: string;
    weight: number;
    basePrice?: number;
    lifespan?: number | null;
    contraband?: boolean;
    rarity?: number;
    traderAffinity?: { [key: string]: number };
}

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
    private goodsData: { [key: string]: { name: string; weight: number } };

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

    private loadGoodsData(): { [key: string]: { name: string; weight: number } } {
        const data = fs.readFileSync(path.join(process.cwd(), 'content', 'goods.json'), 'utf8');
        const goods: GoodData[] = JSON.parse(data);
        return goods.reduce((acc: { [key: string]: { name: string; weight: number } }, good: GoodData) => {
            acc[good.id] = { name: good.name, weight: good.weight };
            return acc;
        }, {});
    }

    addItem(itemId: string, quantity: number): boolean {
        if (!this.goodsData[itemId]) {
            Logger.log(`Invalid item ID: ${itemId}`, 'ERROR');
            return false;
        }

        const existingItem = this.state.items.find(item => item.id === itemId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.state.items.push({
                id: itemId,
                name: this.goodsData[itemId].name,
                quantity: quantity,
                weight: this.goodsData[itemId].weight
            });
        }

        Logger.log(`Added ${quantity} of ${this.goodsData[itemId].name} to inventory`, 'INFO');
        return true;
    }

    removeItem(itemId: string, quantity: number): boolean {
        const existingItem = this.state.items.find(item => item.id === itemId);
        if (!existingItem || existingItem.quantity < quantity) {
            Logger.log(`Cannot remove ${quantity} of ${itemId} from inventory. Insufficient quantity.`, 'WARN');
            return false;
        }

        existingItem.quantity -= quantity;
        if (existingItem.quantity === 0) {
            this.state.items = this.state.items.filter(item => item.id !== itemId);
        }

        Logger.log(`Removed ${quantity} of ${this.goodsData[itemId].name} from inventory`, 'INFO');
        return true;
    }

    getInventory(): InventoryItem[] {
        return [...this.state.items];
    }

    getTotalWeight(): number {
        return this.state.items.reduce((total, item) => total + item.quantity * item.weight, 0);
    }

    getItemQuantity(itemId: string): number {
        const item = this.state.items.find(item => item.id === itemId);
        return item ? item.quantity : 0;
    }

    clearInventory(): void {
        this.state.items = [];
        Logger.log('Inventory cleared', 'INFO');
    }
}