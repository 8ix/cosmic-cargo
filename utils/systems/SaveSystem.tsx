import { System, StateModule } from '../GameEngine';
import Logger from '../Logger';
import { GameState } from '../GameState';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface SaveMetadata {
    saveId: string;
    playerName: string;
    timestamp: number;
    gameVersion: string;
}

class SaveStateModule implements StateModule {
    currentSaveId: string | null = null;
    saveMetadata: SaveMetadata[] = [];

    serialize(): any {
        return {
            currentSaveId: this.currentSaveId,
            saveMetadata: this.saveMetadata,
        };
    }

    deserialize(data: any): void {
        this.currentSaveId = data.currentSaveId;
        this.saveMetadata = data.saveMetadata;
    }
}

export class SaveSystem implements System {
    private state: SaveStateModule;
    private gameState: GameState;
    private savesDirectory: string;
    private gameVersion: string;

    constructor(gameState: GameState, gameVersion: string) {
        this.state = new SaveStateModule();
        this.gameState = gameState;
        this.gameVersion = gameVersion;
        this.savesDirectory = path.join(process.cwd(), 'saves');
    }

    initialize(): void {
        Logger.log('Initializing SaveSystem', 'INFO');
        this.ensureSavesDirectory();
        this.loadSaveMetadata();
    }

    getStateModule(): StateModule {
        return this.state;
    }

    private ensureSavesDirectory(): void {
        if (!fs.existsSync(this.savesDirectory)) {
            fs.mkdirSync(this.savesDirectory, { recursive: true });
            Logger.log(`Created saves directory: ${this.savesDirectory}`, 'INFO');
        }
    }

    private loadSaveMetadata(): void {
        const metadataPath = path.join(this.savesDirectory, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
            try {
                const data = fs.readFileSync(metadataPath, 'utf8');
                this.state.saveMetadata = JSON.parse(data);
                Logger.log(`Loaded ${this.state.saveMetadata.length} save metadata entries`, 'INFO');
            } catch (error) {
                Logger.error(`Failed to load save metadata: ${error}`);
            }
        }
    }

    private saveSaveMetadata(): void {
        const metadataPath = path.join(this.savesDirectory, 'metadata.json');
        try {
            fs.writeFileSync(metadataPath, JSON.stringify(this.state.saveMetadata, null, 2));
            Logger.log('Saved metadata to file', 'INFO');
        } catch (error) {
            Logger.error(`Failed to save metadata: ${error}`);
        }
    }

    saveGame(playerName: string): string {
        const saveId = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        const saveData = this.gameState.serialize();

        const savePath = path.join(this.savesDirectory, `${saveId}.json`);
        try {
            fs.writeFileSync(savePath, JSON.stringify(saveData, null, 2));
            Logger.log(`Game saved to ${savePath}`, 'INFO');

            const metadata: SaveMetadata = {
                saveId,
                playerName,
                timestamp,
                gameVersion: this.gameVersion,
            };
            this.state.saveMetadata.push(metadata);
            this.saveSaveMetadata();

            this.state.currentSaveId = saveId;
            return saveId;
        } catch (error) {
            Logger.error(`Failed to save game: ${error}`);
            throw error;
        }
    }

    loadGame(saveId: string): boolean {
        const savePath = path.join(this.savesDirectory, `${saveId}.json`);
        if (!fs.existsSync(savePath)) {
            Logger.error(`Save file not found: ${savePath}`);
            return false;
        }

        try {
            const data = fs.readFileSync(savePath, 'utf8');
            const saveData = JSON.parse(data);
            this.gameState.deserialize(saveData);
            Logger.log(`Game loaded from ${savePath}`, 'INFO');

            this.state.currentSaveId = saveId;
            return true;
        } catch (error) {
            Logger.error(`Failed to load game: ${error}`);
            return false;
        }
    }

    getSaveMetadata(): SaveMetadata[] {
        return this.state.saveMetadata;
    }

    deleteSave(saveId: string): boolean {
        const savePath = path.join(this.savesDirectory, `${saveId}.json`);
        if (!fs.existsSync(savePath)) {
            Logger.error(`Save file not found: ${savePath}`);
            return false;
        }

        try {
            fs.unlinkSync(savePath);
            Logger.log(`Deleted save file: ${savePath}`, 'INFO');

            this.state.saveMetadata = this.state.saveMetadata.filter(meta => meta.saveId !== saveId);
            this.saveSaveMetadata();

            if (this.state.currentSaveId === saveId) {
                this.state.currentSaveId = null;
            }

            return true;
        } catch (error) {
            Logger.error(`Failed to delete save: ${error}`);
            return false;
        }
    }

    getCurrentSaveId(): string | null {
        return this.state.currentSaveId;
    }
}