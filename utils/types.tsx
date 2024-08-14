
export interface Location {
    id: string;
    name: string;
    coordinates: { x: number; y: number; z: number };
    description: string;
    dominantSpecies: string;
    economyType: string;
    securityLevel: string;
  }
  
  export interface Trader {
    id: string;
    name: string;
    species: string;
    location: string;
    specialization: string;
    reputation: number;
    inventorySize: number;
    restockFrequency: number;
  }
  
  export interface Good {
    id: string;
    name: string;
    basePrice: number;
    weight: number;
    lifespan: number | null;
    contraband: boolean;
    rarity: number;
    traderAffinity: { [key: string]: number };
  }
  
  export interface Ship {
    name: string;
    model: string;
    cargoCapacity: number;
    fuelCapacity: number;
    fuelEfficiency: number;
    speed: number;
    health: number;
    maxHealth: number;
  }
  
  export interface InventoryItem {
    goodId: string;
    quantity: number;
  }
  
  export interface ShipUpgrade {
    id: string;
    name: string;
    description: string;
    cost: number;
    effect: Partial<Record<keyof Omit<Ship, 'name' | 'model'>, number>>;
  }
  
  export interface GameDate {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  }
  
  export interface SaveMetadata {
    saveId: string;
    playerName: string;
    timestamp: number;
    gameVersion: string;
  }