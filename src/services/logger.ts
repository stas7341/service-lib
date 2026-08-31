import { GeneralUtils } from "../utils/general";
import winston from 'winston';
import os from 'os';
import fs from 'fs';

export enum LogLevel {
    error = 0, // the log level that should be used when the application hits an issue
    warn = 1,  // the log level that indicates that something unexpected happened in the application
    info = 2,  // the standard log level indicating that something happened
    debug = 3, // less granular compared to the TRACE level, but it is more than you will need in everyday use
    trace = 4  // very verbose and inside the third-party libraries that you use.
}

const WINSTON_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4
};

export interface LogQueryOptions {
    from: Date;
    until: Date;
    limit?: number;
    start?: number;
    order?: 'desc' | 'asc';
    fields?: string[];
}

export interface LoggerConfig {
    Transports: string[];
    prefix?: string;
    FileDir?: string;
    FileName?: string;
    level?: string;
    max_msg_len?: number;
    maxSize?: number;
    maxFiles?: number;
}

export class Logger {
    private _logger: winston.Logger;
    private lastError: string = "";
    getLastError(): string { return this.lastError; }
    private conf: LoggerConfig = { Transports: ["Console"], max_msg_len: 4096 };
    private static instance: Logger;
    private isInitialized: boolean;

    protected constructor() {
        this._logger = winston.createLogger({
            levels: WINSTON_LEVELS
        });
        this.isInitialized = false;
    }

    isInit = (): boolean => this.isInitialized;

    async init(config: any): Promise<boolean> {
        try {
            if (config && typeof config.get === 'function') {
                config = config.get("Logger", 3) || config.getAll();
            }
            this.conf = config || { Transports: ["Console"], max_msg_len: 4096 };
            const transports = (this.conf.Transports as string[]) || ["Console"];
            this.setTransports(transports);
            this.isInitialized = true;
            return true;
        } catch (err) {
            console.error("Logger init failed:", err);
            return false;
        }
    }

    /**
     * Get a singleton of the logger to serve the whole system.
     */
    static getInstance(): Logger {
        if (!this.instance) {
            this.instance = new Logger();
        }
        return this.instance;
    }

    static customFileFormatterJson(options: any): string {
        return GeneralUtils.JSONStringify({
            name: options.label,
            hostname: os.hostname(),
            level: options.level ? options.level.toUpperCase() : 'INFO',
            msg: options.message !== undefined ? options.message : '',
            pid: process.pid.toString(),
            time: typeof options.timestamp === 'function' ? options.timestamp() : options.timestamp,
            meta: options.meta
        });
    }

    static customFileFormatterTimeStamp(options: any): string {
        const time = typeof options.timestamp === 'function' ? options.timestamp() : options.timestamp;
        const level = options.level ? options.level.toUpperCase() : 'INFO';
        const msg = options.message !== undefined ? options.message : '';
        const meta = options.meta && Object.keys(options.meta).length ? '\n\t' + GeneralUtils.JSONStringify(options.meta) : '';
        return `${time} [${level}] ${msg}${meta}`;
    }

    static winstonCustomFileFormatter(options: { label?: string; level?: string; message?: any; timestamp?: any; meta?: any }) {
        return winston.format.printf(({ label, level, message, timestamp, meta }) => {
            let customFormatter = `${timestamp} [${level}] `;
            customFormatter = customFormatter + (undefined !== message ? message : '');
            customFormatter = customFormatter + (meta && Object.keys(meta).length ? '\n\t' + GeneralUtils.JSONStringify(meta) : '');
            return customFormatter;
        });
    }

    /**
     * Logs the message and the metadata with the given log level.
     * @param message - Interpolated message to log.
     * @param level - The message log level (LogLevel enum)
     * @param metadata - An external info to log with the message.
     */
    log(message: any, level: LogLevel = LogLevel.trace, metadata?: any): void {
        try {
            if (level === LogLevel.error) {
                this.lastError = typeof message === 'object' ? GeneralUtils.JSONStringify(message) : String(message);
            }

            if (message === undefined) {
                return;
            }

            if (typeof metadata === "string") {
                metadata = { message: metadata };
            }

            const levelName = LogLevel[level] || 'trace';
            this._logger.log(levelName, message, metadata);
        } catch (e) {
            console.error("Logger log error:", e);
        }
    }

    error(message: any, metadata?: any): void {
        this.log(message, LogLevel.error, metadata);
    }

    warn(message: any, metadata?: any): void {
        this.log(message, LogLevel.warn, metadata);
    }

    info(message: any, metadata?: any): void {
        this.log(message, LogLevel.info, metadata);
    }

    debug(message: any, metadata?: any): void {
        this.log(message, LogLevel.debug, metadata);
    }

    trace(message: any, metadata?: any): void {
        this.log(message, LogLevel.trace, metadata);
    }

    /**
     * Stream the logs back.
     */
    async streamingLog(): Promise<any> {
        return this._logger.stream({ start: -1 });
    }

    /**
     * Handle an event fired by the logger and sending it to the caller without leaking listeners.
     */
    handle(): Promise<any> {
        return new Promise<any>((resolve) => {
            const onError = (err: any) => {
                this._logger.removeListener('logging', onLogging);
                resolve(err);
            };
            const onLogging = (transport: any, level: any, msg: any, meta: any) => {
                this._logger.removeListener('error', onError);
                resolve({ level, msg, meta });
            };
            this._logger.once('error', onError);
            this._logger.once('logging', onLogging);
        });
    }

    /**
     * Query the log with given options.
     * @param options - LogQueryOptions.
     */
    async query(options: LogQueryOptions): Promise<any> {
        return new Promise((resolve, reject) => {
            (this._logger as any).query(options, (err: any, results: any) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
    }

    async initConfig(config: LoggerConfig): Promise<boolean> {
        return this.init(config);
    }

    private setTransports(transports: string[]) {
        this._logger.clear();
        const prefix = this.conf.prefix || process.pid.toString();
        const level = this.conf.level || 'info';
        const options = { label: prefix, format: 'YYYY-MM-DD HH:mm:ss', level };

        for (const tr of transports) {
            switch (tr.toLowerCase()) {
                case "console":
                    this.addConsoleTransport(options);
                    break;
                case "file": {
                    const dir = this.conf.FileDir || './log/';
                    const filename = this.conf.FileName || 'service.log';
                    const maxSize = this.conf.maxSize;
                    const maxFiles = this.conf.maxFiles;
                    this.addFileTransport({ dir, filename, maxSize, maxFiles }, options);
                    break;
                }
            }
        }
    }

    private addConsoleTransport(options?: { label?: string; format?: string; level?: string }) {
        const {
            label = process.pid.toString(),
            format = 'YYYY-MM-DD HH:mm:ss',
            level = 'info'
        } = options || {};

        this._logger.add(new winston.transports.Console({
            level,
            handleExceptions: true,
            format: winston.format.combine(
                winston.format.metadata(),
                winston.format.label({ label }),
                winston.format.timestamp({ format }),
                this.winstonCustomFileFormatter
            ),
        }));
    }

    private addFileTransport(
        file: { dir: string; filename: string; maxSize?: number; maxFiles?: number },
        options?: { label?: string; format?: string; level?: string }
    ) {
        const {
            label = process.pid.toString(),
            format = 'YYYY-MM-DD HH:mm:ss',
            level = 'info',
        } = options || {};

        if (!fs.existsSync(file.dir)) {
            fs.mkdirSync(file.dir, { recursive: true });
        }

        this._logger.add(new winston.transports.File({
            filename: file.dir.endsWith('/') ? file.dir + file.filename : `${file.dir}/${file.filename}`,
            level,
            maxsize: file.maxSize ? file.maxSize : 10000000, // 10MB max log size
            maxFiles: file.maxFiles ? file.maxFiles : 10,     // 10 max log files
            format: winston.format.combine(
                winston.format.label({ label }),
                winston.format.timestamp({ format }),
                this.winstonCustomFileFormatter
            ),
            handleExceptions: true
        }));
    }

    private winstonCustomFileFormatter = winston.format.printf(info => {
        const maxLen = this.conf?.max_msg_len || 4096;
        const messageFormat = (msg: any) => {
            if (msg === undefined || msg === null) return '';
            const str = typeof msg === 'object' ? GeneralUtils.JSONStringify(msg) : String(msg);
            return str.length > maxLen ? str.substring(0, maxLen) : msg;
        };

        const jsonFormat: { name: string; hostname: string; level: string; msg: any; pid: string; time: any; meta?: object } = {
            name: String(info.label || ''),
            hostname: os.hostname(),
            level: (info.level || '').toUpperCase(),
            msg: messageFormat(info.message),
            pid: process.pid.toString(),
            time: info.timestamp
        };

        const sizeMetadata = GeneralUtils.JSONStringify(info?.metadata || {}).length;
        if (sizeMetadata > 2) {
            if (sizeMetadata > maxLen) {
                jsonFormat.meta = { info: "Metadata size too large, hidden metadata", size: sizeMetadata };
            } else {
                jsonFormat.meta = info.metadata as object;
            }
        }
        return GeneralUtils.JSONStringify(jsonFormat);
    });
}
