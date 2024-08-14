import { System, StateModule } from '../GameEngine';
import Logger from '../Logger';
import { GameState } from '../GameState';

interface GameDate {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
}

class TimeStateModule implements StateModule {
    currentDate: GameDate;
    timeScale: number; // How many real seconds equal one game hour

    constructor() {
        this.currentDate = {
            year: 2500,
            month: 1,
            day: 1,
            hour: 0,
            minute: 0
        };
        this.timeScale = 5; // 5 real seconds = 1 game hour
    }

    serialize(): any {
        return {
            currentDate: this.currentDate,
            timeScale: this.timeScale
        };
    }

    deserialize(data: any): void {
        this.currentDate = data.currentDate;
        this.timeScale = data.timeScale;
    }
}

type TimeEventCallback = (currentDate: GameDate) => void;

export class TimeSystem implements System {
    private state: TimeStateModule;
    private gameState: GameState;
    private intervalId: NodeJS.Timeout | null = null;
    private eventListeners: { [key: string]: TimeEventCallback[] } = {};

    constructor(gameState: GameState) {
        this.state = new TimeStateModule();
        this.gameState = gameState;
    }

    initialize(): void {
        Logger.log('Initializing TimeSystem', 'INFO');
        this.startTimeProgression();
    }

    getStateModule(): StateModule {
        return this.state;
    }

    startTimeProgression(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.intervalId = setInterval(() => this.updateTime(), 1000); // Update every second
    }

    stopTimeProgression(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private updateTime(): void {
        const minutesPerUpdate = 60 / this.state.timeScale;
        this.advanceTime(minutesPerUpdate);
        this.triggerEvents();
    }

    private advanceTime(minutes: number): void {
        this.state.currentDate.minute += minutes;

        while (this.state.currentDate.minute >= 60) {
            this.state.currentDate.minute -= 60;
            this.state.currentDate.hour++;

            if (this.state.currentDate.hour >= 24) {
                this.state.currentDate.hour = 0;
                this.state.currentDate.day++;

                const daysInMonth = this.getDaysInMonth(this.state.currentDate.year, this.state.currentDate.month);
                if (this.state.currentDate.day > daysInMonth) {
                    this.state.currentDate.day = 1;
                    this.state.currentDate.month++;

                    if (this.state.currentDate.month > 12) {
                        this.state.currentDate.month = 1;
                        this.state.currentDate.year++;
                    }
                }
            }
        }
    }

    private getDaysInMonth(year: number, month: number): number {
        return new Date(year, month, 0).getDate();
    }

    getCurrentDate(): GameDate {
        return { ...this.state.currentDate };
    }

    setDate(newDate: Partial<GameDate>): void {
        Object.assign(this.state.currentDate, newDate);
        Logger.log(`Date set to ${this.formatDate(this.state.currentDate)}`, 'INFO');
    }

    setTimeScale(newScale: number): void {
        this.state.timeScale = newScale;
        Logger.log(`Time scale set to ${newScale} seconds per game hour`, 'INFO');
        this.startTimeProgression(); // Restart the interval with the new time scale
    }

    formatDate(date: GameDate): string {
        return `${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')} ${date.hour.toString().padStart(2, '0')}:${date.minute.toString().padStart(2, '0')}`;
    }

    addEventListener(event: string, callback: TimeEventCallback): void {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    removeEventListener(event: string, callback: TimeEventCallback): void {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }

    private triggerEvents(): void {
        const currentDate = this.getCurrentDate();
        
        // Trigger hourly events
        if (currentDate.minute === 0) {
            this.triggerEvent('hourly', currentDate);
        }

        // Trigger daily events
        if (currentDate.hour === 0 && currentDate.minute === 0) {
            this.triggerEvent('daily', currentDate);
        }

        // Trigger monthly events
        if (currentDate.day === 1 && currentDate.hour === 0 && currentDate.minute === 0) {
            this.triggerEvent('monthly', currentDate);
        }

        // Trigger yearly events
        if (currentDate.month === 1 && currentDate.day === 1 && currentDate.hour === 0 && currentDate.minute === 0) {
            this.triggerEvent('yearly', currentDate);
        }
    }

    private triggerEvent(event: string, currentDate: GameDate): void {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(currentDate));
        }
    }
}