import fs from 'fs';
import path from 'path';

export class Logger {
    isEnabled: boolean;
    logDir: string;
    currentLogFile: string;
    
    constructor(isEnabled: boolean = true) {
        this.isEnabled = isEnabled;
        this.logDir = path.join(process.cwd(), 'logs');
        this.currentLogFile = this.generateLogFileName();
        this.ensureLogDirectory();
        this.pruneOldLogs();
    }

    generateLogFileName() {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        return path.join(this.logDir, `game-session-${timestamp}.log`);
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    pruneOldLogs() {
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
        fs.readdirSync(this.logDir).forEach(file => {
        const filePath = path.join(this.logDir, file);
        const fileStat = fs.statSync(filePath);
        if (fileStat.mtimeMs < cutoffTime) {
            fs.unlinkSync(filePath);
        }
        });
    }

    log(message: string, level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG') {
        if (!this.isEnabled) return;

        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;

        fs.appendFileSync(this.currentLogFile, logEntry);
    }

    error(message: string) {
        this.log(message, 'ERROR');
    }

    warn(message: string) {
        this.log(message, 'WARN');
    }

    debug(message: string) {
        this.log(message, 'DEBUG');
    }

    enable() {
        this.isEnabled = true;
        this.log('Logging enabled', 'INFO');
    }

    disable() : void {
        this.log('Logging disabled', 'INFO');
        this.isEnabled = false;
    }
}

export default new Logger();