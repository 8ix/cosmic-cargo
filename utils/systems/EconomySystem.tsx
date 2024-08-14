import { System, StateModule } from '../GameEngine';
import Logger from '../Logger';
import { GameState } from '../GameState';
import { Good, Location } from '../types';
import { loadJSONFile } from '../fileLoader';

interface PriceModifier {
    locationId: string;
    goodId: string;
    modifier: number;
}

class EconomyStateModule implements StateModule {
    priceModifiers: PriceModifier[] = [];

    serialize(): any {
        return {
            priceModifiers: this.priceModifiers
        };
    }

    deserialize(data: any): void {
        this.priceModifiers = data.priceModifiers;
    }
}

export class EconomySystem implements System {
    private state: EconomyStateModule;
    private gameState: GameState;
    private goods: Good[];
    private locations: Location[];

    constructor(gameState: GameState) {
        this.state = new EconomyStateModule();
        this.gameState = gameState;
        this.goods = this.loadGoods();
        this.locations = this.loadLocations();
    }

    initialize(): void {
        Logger.log('Initializing EconomySystem', 'INFO');
        this.initializePriceModifiers();
    }

    getStateModule(): StateModule {
        return this.state;
    }

    private loadGoods(): Good[] {
        return loadJSONFile<Good[]>('goods.json');
    }

    private loadLocations(): Location[] {
        return loadJSONFile<Location[]>('locations.json');
    }

    private initializePriceModifiers(): void {
        this.locations.forEach(location => {
            this.goods.forEach(good => {
                const initialModifier = this.calculateInitialModifier(location, good);
                this.state.priceModifiers.push({
                    locationId: location.id,
                    goodId: good.id,
                    modifier: initialModifier
                });
            });
        });
    }

    private calculateInitialModifier(location: Location, good: Good): number {
        // This is a simple example. You can make this more complex based on your game's economy rules.
        let modifier = 1;

        if (location.economyType === 'industrial' && good.id.startsWith('FUEL')) {
            modifier *= 0.8; // Industrial locations produce fuel more cheaply
        }

        if (location.economyType === 'agricultural' && good.id.startsWith('FOOD')) {
            modifier *= 0.8; // Agricultural locations produce food more cheaply
        }

        if (good.contraband && location.securityLevel === 'high') {
            modifier *= 1.5; // Contraband is more expensive in high-security locations
        }

        // Add some randomness
        modifier *= (0.9 + Math.random() * 0.2);

        return modifier;
    }

    getPrice(goodId: string, locationId: string): number {
        const good = this.goods.find(g => g.id === goodId);
        if (!good) {
            Logger.error(`Good not found: ${goodId}`);
            return 0;
        }

        const modifier = this.state.priceModifiers.find(
            pm => pm.goodId === goodId && pm.locationId === locationId
        )?.modifier || 1;

        return good.basePrice * modifier;
    }

    updatePrices(): void {
        this.state.priceModifiers.forEach(pm => {
            // Simulate market fluctuations
            pm.modifier *= (0.95 + Math.random() * 0.1);
        });
        Logger.log('Updated market prices', 'INFO');
    }

    // Additional methods for more complex economic simulations can be added here
}