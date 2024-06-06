import {IRedisCommands} from "../interfaces/redis.interface";
import {LogLevel} from "../services/logger";
import {TKeyTypes, TPairTypes, TValueTypes} from "../model/types";
import EventEmitter from "node:events";

export interface cacheRemoteConfig {
    prefix: string,
    redis: IRedisCommands,
    expirationSec: number
}

export class RemoteCache extends EventEmitter{
    constructor(protected config: cacheRemoteConfig) {
        super();
        if(!config.redis)
            throw new Error("wrong parameters");
        this.config.prefix = config.prefix ? `${config.prefix}:` : `${process.env.npm_package_name}:`;
        this.config.expirationSec = config.expirationSec ? config.expirationSec : 14400; // default 4 hours
    }

    log = (msg: string, level: LogLevel, metadata?: {} | undefined) => {
        this.emit("log", msg, level, metadata);
    };

    getMultiOperator = () => this.config.redis.getClient().multi();

    execMulti = async (multiOperator) => multiOperator.exec();

    private async setExpiration(key: string, ttl: number, mode?: "NX" | "XX" | "GT" | "LT") {
        return this.config.redis.setExpiration(key, ttl, mode).catch(err => {
            this.log(`cache failed to setExpiration ${key}`, LogLevel.error, {err, ttl, mode});
            throw err;
        });
    }

    getKeyWithPrefix = (key: TKeyTypes) => {
        if (key.toString().startsWith(this.config.prefix))
            return key;
        return (this.config.prefix + key.toString()).toLowerCase();
    };

    async get(key: TKeyTypes) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.getItem(prefixedKey).catch(err => {
            this.log(`cache didn't find ${key}`, LogLevel.trace, err);
            return null;
        });
    }

    async delete(key: TKeyTypes) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.deleteItem(prefixedKey)
            .catch(err => {
                this.log(`cache failed to delete ${key}`, LogLevel.trace, err);
            });
    }

    async set(key: TKeyTypes, value: TValueTypes, dynamicTtlSec?: number, multiOperator?) {
        const prefixedKey = this.getKeyWithPrefix(key);

        if(multiOperator) {
            multiOperator.set(prefixedKey, value);
            multiOperator.expire(prefixedKey.toString(), dynamicTtlSec ?? this.config.expirationSec);
            return;
        }

        multiOperator = this.getMultiOperator();
        multiOperator.set(prefixedKey, value);
        multiOperator.expire(prefixedKey.toString(), dynamicTtlSec ?? this.config.expirationSec);

        const result: any[] = await this.execMulti(multiOperator);
        return !result?.includes(false);
    }

    async getAllItemsFromSet(key: TKeyTypes) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.getAllItemFromSet(prefixedKey.toString()).catch(err => {
            this.log(`cache failed to getAllItemFromSet ${key}`, LogLevel.error, err);
        });
    }

    async addItemToSet(key: TKeyTypes, value: string | string[], dynamicTtlSec?: number, multiOperator?) {
        const prefixedKey = this.getKeyWithPrefix(key);

        if(multiOperator) {
            multiOperator.sAdd(prefixedKey, value);
            multiOperator.expire(prefixedKey.toString(), dynamicTtlSec ?? this.config.expirationSec);
            return;
        }

        multiOperator = this.getMultiOperator();
        multiOperator.sAdd(prefixedKey, value);
        multiOperator.expire(prefixedKey.toString(), dynamicTtlSec ?? this.config.expirationSec);

        const result: any[] = await this.execMulti(multiOperator);
        return !result?.includes(false);
    }

    async removeItemFromSet(key: TKeyTypes, value: string | string[]) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.removeItemFromSet(prefixedKey.toString(), value).catch(err => {
            this.log(`cache failed to removeItemFromSet ${key}`, LogLevel.error, err);
        });
    }

    async numberOfItemFromSet(key: TKeyTypes) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.numberOfItemFromSet(prefixedKey.toString()).catch(err => {
            this.log(`cache failed to numberOfItemFromSet ${key}`, LogLevel.error, err);
        });
    }

    async addPairToHash(key: TKeyTypes, fieldName: TValueTypes, fieldValue: TValueTypes, dynamicTtlSec?: number, multiOperator?) {
        const prefixedKey = this.getKeyWithPrefix(key);

        if(multiOperator) {
            multiOperator.hSet(prefixedKey, this.convertToString(fieldName), fieldValue);
            multiOperator.expire(prefixedKey.toString(), dynamicTtlSec ?? this.config.expirationSec);
            return;
        }

        multiOperator = this.getMultiOperator();
        multiOperator.hSet(prefixedKey, this.convertToString(fieldName), fieldValue);
        multiOperator.expire(prefixedKey.toString(), dynamicTtlSec ?? this.config.expirationSec);

        const result: any[] = await this.execMulti(multiOperator);
        return !result?.includes(false);
    }

    async addPairsToHash(key: TKeyTypes, pairs: TPairTypes, dynamicTtlSec?: number, multiOperator?) {
        const prefixedKey = this.getKeyWithPrefix(key);

        const convertKeysToStrings = (input: TPairTypes): TPairTypes => {
            if (Array.isArray(input)) {
                return input.map(item => this.convertToString(item)) as TPairTypes;
            } else if (input instanceof Map) {
                const newMap = new Map();
                input.forEach((value, key) => {
                    newMap.set(this.convertToString(key), value);
                });
                return newMap as TPairTypes;
            } else if (typeof input === 'object' && input !== null) {
                // If the input is an object, create a new object with converted keys
                const newObj: Record<string, TValueTypes> = {};
                for (const [key, value] of Object.entries(input)) {
                    newObj[this.convertToString(key)] = value;
                }
                return newObj as TPairTypes;
            } else {
                return input;
            }
        }

        if(multiOperator) {
            multiOperator.hSet(prefixedKey, convertKeysToStrings(pairs));
            multiOperator.expire(prefixedKey.toString(), dynamicTtlSec ?? this.config.expirationSec);
            return;
        }

        multiOperator = this.getMultiOperator();
        multiOperator.hSet(prefixedKey, convertKeysToStrings(pairs));
        multiOperator.expire(prefixedKey.toString(), dynamicTtlSec ?? this.config.expirationSec);

        const result: any[] = await this.execMulti(multiOperator);
        return !result?.includes(false);
    }

    async removePair(key: TKeyTypes, field: TKeyTypes) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.removeFieldFromHash(prefixedKey, this.convertToString(field));
    }

    async removePairs(key: TKeyTypes, fields: Array<TKeyTypes>) {
        const prefixedKey = this.getKeyWithPrefix(key);
        const convertedFields = fields.map(field => this.convertToString(field));
        return this.config.redis.removeFieldFromHash(prefixedKey, convertedFields);
    }

    async getFieldFromHash(key: TKeyTypes, field: TKeyTypes) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.getFieldFromHash(prefixedKey, this.convertToString(field));
    }

    private convertToString(input: any) {
        if (typeof input === 'object' && input !== null) {
            return JSON.stringify(input);
        } else {
            return String(input);
        }
    }

    async getFieldsFromHash(key: TKeyTypes, fields: TKeyTypes | Array<TKeyTypes>) {
        const prefixedKey = this.getKeyWithPrefix(key);
        if (!Array.isArray(fields)) {
            return this.config.redis.getFieldsFromHash(prefixedKey, this.convertToString(fields));
        } else {
            const convertedFields = fields.map(field => this.convertToString(field));
            return this.config.redis.getFieldsFromHash(prefixedKey, convertedFields);
        }
    }

    async getAllFieldsFromHash(key: TKeyTypes) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.getAllFieldsFromHash(prefixedKey);
    }

    async incFieldInHash(key: TKeyTypes, field: TKeyTypes, increment: number) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.incFieldInHash(prefixedKey, this.convertToString(field), increment);
    }

    async incFloatFieldInHash(key: TKeyTypes, field: TKeyTypes, increment: number) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.incFloatFieldInHash(prefixedKey, this.convertToString(field), increment);
    }

    async getFieldNamesFromHash(key: TKeyTypes) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.getFieldNamesFromHash(prefixedKey);
    }

    async getNumberOfFieldsInHash(key: TKeyTypes) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.getNumberOfFieldsInHash(prefixedKey);
    }

    async getRandomFieldFromHash(key: TKeyTypes) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.getRandomFieldFromHash(prefixedKey);
    }

    async getRandomFieldsFromHash(key: TKeyTypes, count: number) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.getRandomFieldsFromHash(prefixedKey, count);
    }

    async getRandomFieldsAndValuesFromHash(key: TKeyTypes, count: number) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.getRandomFieldsAndValuesFromHash(prefixedKey, count);
    }

    async getClient() {
        return this.config.redis.getClient();
    }

    async isKeyExist(key: TKeyTypes) {
        const prefixedKey = this.getKeyWithPrefix(key);
        return this.config.redis.isKeyExist(prefixedKey);
    }

}
