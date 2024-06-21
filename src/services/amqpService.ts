"use strict";
import {Message} from "../model/message";
import EventEmitter from "node:events";
import {LogLevel} from "./logger";
const TIMEOUT = 30000;
export type handlingMessage = (msg: any, ch: any)  => Promise<boolean>;

export type handlingMessageUid = (msg: any, ch: any, uid?: string)  => Promise<boolean>;

export interface amqpConfig {
    username: string,
    password: string,
    host: string,
    options_durable: boolean,
    options_noAck: boolean,
    prefetch: number
}

const channelClose = (ch) => ch.close();

const log = ( msg: string, level: LogLevel = LogLevel.info, metadata: any = undefined) =>
    amqpService.getInstance().log(msg, level, metadata);

export class amqpService extends EventEmitter {
    private amqpLib = require('amqplib/callback_api');
    private config = {} as amqpConfig;
    private amqp: any;
    private reconnectStarted: boolean;

    private static instance: amqpService;
    private isInitialized: boolean;
    protected constructor() {
        super();
        amqpService.instance = this;
        this.isInitialized = false;
        this.reconnectStarted = false;
    }
    isInit = () => {
        if(!this.isInitialized)
            throw new Error(`Service ${this.constructor.name} is not initialized.`);
        return true;
    };

    static getInstance(): amqpService {
        if (!this.instance)
            this.instance = new amqpService();
        return this.instance as amqpService;
    }

    log(msg: string, level: LogLevel = LogLevel.info, metadata?: any) {
        this.emit("log", msg, level, metadata);
    }

    async close() {
        this.isInitialized = false;
        await this?.amqp?.close();
        delete this?.amqp;
    }

    reconnect(config: amqpConfig) {
        if(this.reconnectStarted) {
            log("already started to reconnect..", LogLevel.trace);
            return;
        }

        this.reconnectStarted = true;
        if(this.amqp) {
            this.close();
        }
        setTimeout(async () => {
                    return this.init(config);
                }, TIMEOUT);
        log("try to reconnect..", LogLevel.trace);
    }

    reconnectSubscriber(exchange:string, routingKey:string, queueName: string, controller: handlingMessage,
                         options: {
                             exchangeType: string,
                             maxPriority?: number,
                             reconnectOnClose: boolean,
                             prefetch: number,
                             options_noAck: boolean,
                             options_durable: boolean} =
                             {exchangeType: "topic", reconnectOnClose: true, prefetch: 1, options_noAck: false, options_durable: true}
                         ) {
        if(this.isInitialized) {
            setTimeout(async () => {
                await this.subscribe(exchange, routingKey, queueName, controller, options).catch((err) => {
                    this.reconnectSubscriber(exchange, routingKey, queueName, controller,options);
                });
            }, TIMEOUT);
            log("try to resubscribe..", LogLevel.trace, {exchange, routingKey, queueName, controller, options});
        }
        else {
            setTimeout(() => {
                this.reconnectSubscriber(exchange, routingKey, queueName, controller, options);
            }, TIMEOUT);
        }
    }

    async init(config: amqpConfig): Promise<boolean> {
        if(this.isInitialized) {
            log("already initialized..", LogLevel.trace);
            return true;
        }
        this.reconnectStarted = false;

        return new Promise<boolean>((resolve) => {
            this.config = config;

            if (this.config.username.length === 0 || this.config.password.length === 0 || this.config.host.length === 0) {
                log('input parameters validation failed', LogLevel.error);
                return resolve(false);
            }

            if (process.env.NODE_ENV === 'dummy_test') {
                this.isInitialized = true;
                return resolve(true);
            }

            const amqpHost = `amqp://${this.config.username ||
            'guest'}:${this.config.password ||
            'guest'}@${this.config.host}`;
            this.amqpLib.connect(amqpHost, async (err, conn) => {
                if (err !== null) {
                    log(err, LogLevel.error);
                    await this.reconnect(config);
                    return resolve(false);
                }

                conn.on("error", (err) => {
                    if (err.message !== "Connection closing") {
                        log(err.message, LogLevel.error);
                    }
                });
                conn.on("close", () => {
                    log("reconnecting...", LogLevel.trace);
                    if(this.isInitialized) {
                        this.reconnect(config);
                    }
                });

                this.amqp = conn;
                this.isInitialized = true;
                log('connected to host', LogLevel.trace);
                return resolve(true);
            });
        });
    }

    async subscribe(exchange:string, routingKey:string, queueName: string, controller: handlingMessageUid,
                    options: {
                        exchangeType: string,
                        maxPriority?: number,
                        reconnectOnClose: boolean,
                        prefetch: number,
                        options_noAck: boolean,
                        options_durable: boolean} =
                        {exchangeType: "topic", reconnectOnClose: true, prefetch: 1, options_noAck: false, options_durable: true}
                    ): Promise<any>{
        this.isInit();
        log(`Subscribe ${exchange}, ${routingKey}, ${queueName}`, LogLevel.trace, options);

        if (!controller || !queueName || queueName.length === 0)
            throw new Error('wrong parameters: controller and queue name');

        if ((exchange.length > 0 && routingKey.length === 0) || (exchange.length === 0 && routingKey.length > 0))
            throw new Error('wrong parameters: exchange and routing key');

        if (options.maxPriority && options.maxPriority > 10) {
            throw new Error('maxPriority should be less or equal to 10')
        }

        this.amqp.createChannel((err, ch) => {
            if (err !== null) {
                log(err, LogLevel.error);
                return;
            }

            if(exchange !== "") {
                ch.assertExchange(exchange, options.exchangeType, {
                    durable: (options?.options_durable || this?.config?.options_durable || true),
                    maxPriority: options?.maxPriority
                });
            }

            ch.on("error", (err) => {
                log(err.message, LogLevel.error);
                return;
            });
            ch.on("close", () => {
                if(options.reconnectOnClose) {
                    log("subscribe channel reconnecting...", LogLevel.trace);
                    return this.reconnectSubscriber(exchange, routingKey, queueName, controller, options);
                }
            });

            ch.assertQueue(queueName, { durable: this.config.options_durable, maxPriority: options.maxPriority}, (error, q) => {
                if (error !== null) {
                    log("failed", LogLevel.error, error);
                }

                if(exchange !== "") {
                    ch.bindQueue(q.queue, exchange, routingKey);
                    log("bind to queue: " + q.queue, LogLevel.trace);
                }

                const prefetch = options?.prefetch || this?.config?.prefetch || 1;
                ch.prefetch(Number(prefetch));

                ch.consume(q.queue, async(msg) => {
                    // const messageBody = msg.content.toString().trim();

                    controller(msg, ch)
                        .then((returnCode) => {
                            log('on ack msg', returnCode ? LogLevel.trace : LogLevel.trace);
                            ch.ack(msg);
                        }).catch(err=> {
                        log("" + err, LogLevel.error);
                        throw new Error(err);
                    });
                }, {
                    noAck: options?.options_noAck || this?.config?.options_noAck || false
                });
            });
        });
    }

    private async sendOrPublish(action: string, params: any) {
        return new Promise((resolve, reject) => {
            try {
                this.amqp.createChannel((err, ch) => {
                    if (err !== null) {
                        log(err, LogLevel.error);
                        return reject(err);
                    }
                    ch.on('error', error => {
                        log("" + error, LogLevel.error)
                        return reject(error);
                    });

                    // convert message (string or Message type) to buffer
                    let bufferToSend;
                    if (typeof params.message === "string") {
                        bufferToSend = Buffer.from(params.message.toString());
                    } else if (typeof params.message === "object") {
                        bufferToSend = Buffer.from(JSON.stringify(params.message));
                    } else {
                        channelClose(ch);
                        return reject("message type not supported");
                    }

                    // sendToQueue or publish message according to action
                    if (action === "send") {
                        const {queueName, message, priority} = params;
                        // ch.assertQueue(queueName, { durable: this.config.options_durable, priority}, err => {
                        ch.checkQueue(queueName, (err) => {
                            if (err !== null) {
                                log(err, LogLevel.error);
                                return reject(err);
                            }

                            ch.sendToQueue(queueName, bufferToSend, {priority});
                            channelClose(ch);
                            return resolve(null);
                        });
                    } else if (action === "publish") {
                        const {exchange, routingKey, message, exchangeType, priority} = params;

                        ch.checkExchange(exchange, (err) => {
                            if (err !== null) {
                                log(err, LogLevel.error);
                                return reject(err);
                            }

                            ch.publish(exchange, routingKey, bufferToSend, {persistent: true, priority});
                            channelClose(ch);
                            return resolve(null);
                        });
                    } else {
                        channelClose(ch);
                        return reject("unsupported action");
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    async sendToQueue(queueName: string, message: Message, priority: number = 1) {
        this.isInit();
        log(`post to queue ${queueName}, priority: ${priority}`, LogLevel.trace, message);

        if (!queueName || queueName.length === 0)
            throw new Error('sendToQueue::wrong parameters: queue name');

        if ( !(message && message.action && message.action.length > 0 && message.payload))
            throw new Error('We are expecting message format with action and payload, got: ' + JSON.stringify(message));

        await this.sendOrPublish("send", {queueName, message, priority});
    }

    async sendStringToQueue(queueName: string, message: string, priority: number = 1) {
        this.isInit();
        log(`post to queue ${queueName}, priority: ${priority}`, LogLevel.trace, message);

        if (!queueName || queueName.length === 0)
            throw new Error('sendStringToQueue::wrong parameters: queue name');

        if (message.length === 0)
            throw new Error('we are expecting message in string format, got: ' + message.toString());

        await this.sendOrPublish("send", {queueName, message, priority});
    }

    async publishMessage(exchange: string, routingKey: string, message: Message, exchangeType: string = "topic", priority: number = 1) {
        this.isInit();
        log(`publish ${exchange}-${routingKey}}, priority: ${priority}`, LogLevel.trace, message);

        if (!(message && message.action && message.action.length > 0 && message.payload))
            throw new Error('we are expecting message format with action and payload, got: ' + JSON.stringify(message));

        if (process.env.NODE_ENV === 'dummy_test') {
            if (exchange.length === 0 || routingKey.length === 0)
                throw new Error('wrong parameters: exchange and routingKey');
            return JSON.stringify(message);
        }

        await this.sendOrPublish("publish", {exchange, routingKey, message, exchangeType, priority});
    }

    async publishString(exchange: string, routingKey: string, message: string, exchangeType: string = "topic", priority: number = 1) {
        this.isInit();
        log(`publish ${exchange}-${routingKey}}`, LogLevel.trace, message);

        if (message.length === 0)
            throw new Error('we are expecting message in string format, got: ' + message);

        if (process.env.NODE_ENV === 'dummy_test') {
            if (!(exchange.length === 0 || routingKey.length === 0)) {
                return message.toString();
            } else {
                throw new Error('wrong parameters: exchange and routingKey');
            }
        }

        await this.sendOrPublish("publish", {exchange, routingKey, message, exchangeType, priority});
    }

    getQueueLength(queueName: string): Promise<number> {
        return new Promise((resolve, reject) => {
            try {
                this.isInit();
                if (!queueName || queueName.length === 0)
                    return reject("getQueueLength::wrong parameters: queue name");

                this.amqp.createChannel((err, ch) => {
                    if (err !== null) return reject(err);
                    ch.on('error', error => {
                        log("failed", LogLevel.error, error);
                        return reject(error);
                    });
                    ch.checkQueue(queueName, (err, queue_info) => {
                        if (err !== null) {
                            return reject(err);
                        }
                        channelClose(ch);
                        return resolve(queue_info.messageCount);
                    });
                });
            }
            catch (err) {
                reject(err);
            }
        });
    }

    getMessage(queueName: string, prefetch: number = 1) {
        return new Promise<string>((resolve, reject) => {
            try {
                this.isInit();
                if (!queueName || queueName.length === 0)
                    return reject('getMessage::wrong parameters: queue name');

                this.amqp.createChannel((err, ch) => {
                    if (err !== null) return reject(err);
                    ch.on('error', error => {
                        log("" + error, LogLevel.error)
                        return reject(error);
                    });
                    ch.prefetch(prefetch);
                    ch.get(queueName, {noAck: true}, (err, msg) => {
                        if (err !== null || msg === false) {
                            return reject(err);
                        }
                        channelClose(ch);
                        return resolve(msg.content.toString().trim());
                    });
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    isQueueExist(queueName: string) {
        return new Promise<boolean>((resolve, reject) => {
            try {
                this.isInit();
                if (!queueName || queueName.length === 0) {
                    return reject('isQueueExist::wrong parameters: queue name');
                }

                this.amqp.createChannel((err, ch) => {
                    if (err !== null) return resolve(false);
                    ch.on('error', error => {
                        log("" + error, LogLevel.error)
                        return resolve(false);
                    });
                    ch.checkQueue(queueName, (err) => {
                        if (err !== null) {
                            return resolve(false);
                        }
                        channelClose(ch);
                        return resolve(true);
                    });
                });
            }
            catch (err) {
                reject(err);
            }
        });
    }

    createQueue(queueName: string, maxPriority?: number) {
        return new Promise<boolean>((resolve, reject) => {
            try {
                this.isInit();
                if (!queueName || queueName.length === 0) {
                    return reject('createQueue::wrong parameters: queue name');
                }

                this.amqp.createChannel((err, ch) => {
                    if (err !== null) return resolve(false);
                    ch.on('error', error => {
                        log("" + error, LogLevel.error)
                        return resolve(false);
                    });
                    ch.assertQueue(queueName, {durable: this.config.options_durable, maxPriority}, (error, q) => {
                        if (error !== null) {
                            return resolve(false);
                        }
                        channelClose(ch);
                        return resolve(true);
                    });
                });
            }
            catch (err) {
                reject(err);
            }
        });
    }

    getQueueInfo(queueName: string) {
        return new Promise((resolve, reject) => {
            try {
                this.isInit();
                if (!queueName || queueName.length === 0)
                    return reject('getQueueInfo::wrong parameters: queue name');

                this.amqp.createChannel((err, ch) => {
                    if (err !== null) return resolve(false);
                    ch.on('error', error => {
                        log("failed", LogLevel.error, error);
                        return resolve({});
                    });
                    ch.checkQueue(queueName, (error, info) => {
                        if (error !== null) {
                            return resolve({});
                        }
                        channelClose(ch);
                        return resolve(info);
                    });
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    purgeQueue(queueName: string) {
        return new Promise((resolve, reject) => {
            try {
                this.isInit();
                if (!queueName || queueName.length === 0)
                    return reject('purgeQueue::wrong parameters: queue name');

                this.amqp.createChannel((err, ch) => {
                    if (err !== null) return resolve(false);
                    ch.on('error', error => {
                        log("" + error, LogLevel.error)
                        return reject(error);
                    });
                    ch.purgeQueue(queueName, (error) => {
                        if (error !== null) {
                            return reject(error);
                        }
                        channelClose(ch);
                        return resolve(true);
                    });
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    removeQueue(queueName: string) {
        return new Promise((resolve, reject) => {
             try {
                 this.isInit();
                 if (!queueName || queueName.length === 0) {
                     return reject('removeQueue::wrong parameters: queue name');
                 }

                this.amqp.createChannel((err, ch) => {
                    if (err !== null) {
                        return resolve(false);
                    }
                    ch.on('error', error => {
                        log("" + error, LogLevel.error)
                        return resolve(false);
                    });
                    ch.deleteQueue(queueName, (error) => {
                        if (error !== null) {
                            return resolve(false);
                        }
                        channelClose(ch);
                        return resolve(true);
                    });
                });
            } catch (err) {
                reject(err);
            }
        });
    }
}
