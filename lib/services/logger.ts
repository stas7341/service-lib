"use strict";
import {GeneralUtils} from "../utils/general";
const winston = require('winston');
const os = require('os');
const fs = require('fs');

export enum LogLevel {
    error, // the log level that should be used when the application hits an issue
    warn, // the log level that indicates that something unexpected happened in the application
    info, // the standard log level indicating that something happened
    debug, // less granular compared to the TRACE level, but it is more than you will need in everyday use
    trace// very verbose and inside the third-party libraries that you use.
}

export interface LogQueryOptions {
    from: Date,
    until: Date,
    limit?: 10,
    start?: 0,
    order?: 'desc',
    fields?: string[]
}

export interface LoggerConfig {
    Transports: string[],
    prefix?: string,
    FileDir?: string,
    FileName?: string,
    level?: string,
    max_msg_len?: number
}

export class Logger{
    private _logger;
    private lastError: string = "";
    private reconnectStarted: boolean;
    getLastError() { return this.lastError; }
    private conf: any;
    private static instance: any;
    private isInitialized: boolean;
    protected constructor() {
        this._logger = winston.createLogger({levels: LogLevel});
        this.isInitialized = false;
        this.reconnectStarted = false;
    }
    isInit = () => this.isInitialized;


    async init(config) : Promise<boolean> {
        try {
            this.conf = config;
            const transports = config["Transports"] as string[] || [];
            const prefix = config["prefix"] || process.pid.toString();
            this.setTransports(transports);
            this.isInitialized = true;
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    }

    /**
     * Get a singleton of the logger to serve the whole system.
     * @param: configuration - an external configuration object. Default will take the log configuration from the configuration service.
     */
    static getInstance(): Logger {
        if (!this.instance)
            this.instance = new Logger();
        return <Logger>this.instance;
    }

    static customFileFormatterJson(options) {
        return JSON.stringify({
            name: options.label,
            hostname: os.hostname(),
            level: options.level.toUpperCase(),
            msg: (undefined !== options.message ? options.message : ''),
            pid: process.pid.toString(),
            time: options.timestamp(),
            meta: options.meta
        });
    }

    static customFileFormatterTimeStamp(options) {
        // Return string will be passed to logger.
        return options.timestamp() + ' [' + options.level.toUpperCase() + '] ' + (undefined !== options.message ? options.message : '') +
            (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
    }

    static winstonCustomFileFormatter(options: {label, level, message, timestamp, meta}) {
        // Return string will be passed to logger.
        return winston.format.printf(({label, level, message, timestamp, meta}) => {
            let customFormatter = `${timestamp} [${level}] `;
            customFormatter = customFormatter + (undefined !== message ? message : '');
            customFormatter = customFormatter + (meta && Object.keys(meta).length ? '\n\t' + JSON.stringify(meta) : '')
            return customFormatter;
        });
    }


    /**
     * Logs the message and the metadata with the given log level.
     * @param: level - The message log level (LogLevel enum)
     * @param: message - Interpolated message to log. Example: 'test message %s', 'my string'.
     * @param: metadata - An external info to log with the message.
     */
    log(message: any, level: LogLevel = LogLevel.trace, metadata?: {}) {
        try {
            this.isInit();

            if (level === LogLevel.error) {
                this.lastError = message;
            }

            if (message === undefined)
                return;
            if (typeof metadata === "string") {
                metadata = {message: metadata};
            }
            this._logger.log(LogLevel[level], message, metadata);
        } catch (e) {
            console.log(e);
        }
    }

    /**
     * Stream the logs back .
     */
    async streamingLog() {
        await this._logger.stream({start: -1}).on('log');
    }

    /**
     * Handle an event fired by the logger and sending it to the caller.
     */
    handle() {
        this.isInit();
        return new Promise<any>((resolve, reject) => {
            this._logger.on('error', function (err) {
                resolve(err);
            });
            this._logger.on('logging', function (transport, level, msg, meta) {
                // [msg] and [meta] have now been logged at [level] to [transport]
                resolve({ level: level, msg: msg, meta: meta });
            });
        });
    }

    /**
     * Query the log with a given options.
     * @param: options - LogQueryOptions.
     */
    async query(options: LogQueryOptions) {
        this.isInit();
        try {
            await this._logger.query(options);
        } catch (ex) {
            throw ex;
        }
    }

    async initConfig(config: LoggerConfig) {
        try {
            if (!config.Transports.length) {
                console.log(`missed Transports configuration!!! no logger init`);
                return;
            }
            this.conf = config;
            this.setTransports(this.conf.Transports);
            this.isInitialized = true;
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    }

    private setTransports(transports: string[]) {
        this._logger.clear();
        const {
            prefix = process.pid.toString(),
            level = 'info'
        } = this.conf
        const options = {label: prefix, format: 'YYYY-MM-DD HH:mm:ss', level};
        transports.map(tr => {
            switch (tr.toLowerCase()) {
                case "console":
                    this.addConsoleTransport(options);
                    break;
                case "file":
                    const {FileDir: dir = './log/', FileName: filename = 'service.log', maxSize, maxFiles} = this.conf;
                    this.addFileTransport({dir, filename, maxSize, maxFiles}, options);
                    break;
            }
        })
    }

    private addConsoleTransport(options?: { label?: string, format?: string, level?: string }) {
        const {
            label = process.pid.toString(),
            format = 'YYYY-MM-DD HH:mm:ss',
            level = 'info'
        } = options || {};

        this._logger.add(new winston.transports.Console({
            level,
            handleExceptions: true,
            json: false,
            format: winston.format.combine(
                winston.format.metadata(),
                winston.format.label({label}),
                winston.format.timestamp({format}),
                this.winstonCustomFileFormatter
            ),
        }));
    }

    private addFileTransport(
        file: { dir: string, filename: string, maxSize?: number, maxFiles?: number },
        options?: { label?: string, format?: string, level?: string }) {

        const {
            label = process.pid.toString(),
            format = 'YYYY-MM-DD HH:mm:ss',
            level = 'info',
        } = options || {};

        if (!fs.existsSync(file.dir)) {
            // Create the directory if it does not exist
            fs.mkdirSync(file.dir);
        }
        this._logger.add(new winston.transports.File({
            filename: file.dir + (file.filename),
            json: false,
            level,
            maxsize: file?.maxSize ? file.maxSize : 10000000, // 10MB max log size
            maxFiles: file?.maxFiles ? file.maxFiles : 10, // 10 max log files
            format: winston.format.combine(
                winston.format.label({label}),
                winston.format.timestamp({format}),
                this.winstonCustomFileFormatter
            ),
            handleExceptions: true,
            humanReadableUnhandledException: true,
            exitOnError: false
        }));
    }

    private winstonCustomFileFormatter = winston.format.printf(info => {
        const messageFormat = (msg) => {
            const len = msg ? JSON.stringify(msg).length : 0;
            return (len > this.conf.max_msg_len) ? JSON.stringify(msg).substring(0, this.conf.max_msg_len || 4096) : msg;
        };

        const jsonFormat: { name: string, hostname: string, level: string, msg: any, pid: string, time: string, meta?: object } = {
            name: info.label,
            hostname: os.hostname(),
            level: info.level.toUpperCase(),
            msg: messageFormat(info.message),
            pid: process.pid.toString(),
            time: info.timestamp
        };

        /*
         minimum string size of json object is 2 ('{}').
         info.metadata is always created, could be empty object or not empty object.
         */
        const sizeMetadata = GeneralUtils.JSONStringify(info?.metadata || {}).length;
        if (sizeMetadata > 2) {
            if (sizeMetadata > this.conf.max_msg_len)
                jsonFormat.meta = {info: "Metadata size too large, hidden metadata", size: sizeMetadata};
            else
                jsonFormat.meta = info.metadata;
        }
        return GeneralUtils.JSONStringify(jsonFormat);
    });


}
