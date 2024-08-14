import { System, StateModule } from '../GameEngine';
import Logger from '../Logger';
import { GameState } from '../GameState';
import fs from 'fs';
import path from 'path';

interface Location {
    id: string;
    name: string;
    coordinates: { x: number; y: number; z: number };
    description: string;
    dominantSpecies: string;
    economyType: string;
    securityLevel: string;
}

class LocationStateModule implements StateModule {
    locations: Location[] = [];
    currentLocationId: string | null = null;

    serialize(): any {
        return {
            locations: this.locations,
            currentLocationId: this.currentLocationId,
        };
    }

    deserialize(data: any): void {
        this.locations = data.locations;
        this.currentLocationId = data.currentLocationId;
    }
}

export class LocationSystem implements System {
    private state: LocationStateModule;
    private gameState: GameState;

    constructor(gameState: GameState) {
        this.state = new LocationStateModule();
        this.gameState = gameState;
    }

    initialize(): void {
        Logger.log('Initializing LocationSystem', 'INFO');
        this.loadLocations();
        if (this.state.locations.length > 0) {
            this.state.currentLocationId = this.state.locations[0].id;
        }
    }

    getStateModule(): StateModule {
        return this.state;
    }

    private loadLocations(): void {
        try {
            const data = fs.readFileSync(path.join(process.cwd(), 'content', 'locations.json'), 'utf8');
            this.state.locations = JSON.parse(data);
            Logger.log(`Loaded ${this.state.locations.length} locations`, 'INFO');
        } catch (error) {
            Logger.error(`Failed to load locations: ${error}`);
        }
    }

    getCurrentLocation(): Location | null {
        if (!this.state.currentLocationId) return null;
        return this.state.locations.find(loc => loc.id === this.state.currentLocationId) || null;
    }

    getAllLocations(): Location[] {
        return this.state.locations;
    }

    travelTo(locationId: string): boolean {
        const targetLocation = this.state.locations.find(loc => loc.id === locationId);
        if (!targetLocation) {
            Logger.error(`Attempted to travel to non-existent location: ${locationId}`);
            return false;
        }

        const currentLocation = this.getCurrentLocation();
        if (currentLocation) {
            const distance = this.calculateDistance(currentLocation, targetLocation);
            // Here you could add logic to check if the player has enough fuel, time, etc. to make the journey
            Logger.log(`Traveling from ${currentLocation.name} to ${targetLocation.name}. Distance: ${distance.toFixed(2)} units`, 'INFO');
        }

        this.state.currentLocationId = locationId;
        Logger.log(`Arrived at ${targetLocation.name}`, 'INFO');
        return true;
    }

    private calculateDistance(loc1: Location, loc2: Location): number {
        const dx = loc1.coordinates.x - loc2.coordinates.x;
        const dy = loc1.coordinates.y - loc2.coordinates.y;
        const dz = loc1.coordinates.z - loc2.coordinates.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }

    getAvailableLocations(): Location[] {
        // In a more complex game, you might want to filter locations based on player's ship range, known routes, etc.
        return this.state.locations.filter(loc => loc.id !== this.state.currentLocationId);
    }

    getLocationInfo(locationId: string): Location | null {
        return this.state.locations.find(loc => loc.id === locationId) || null;
    }
}