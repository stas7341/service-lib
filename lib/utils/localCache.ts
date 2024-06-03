import NodeCache from "node-cache";

const checkperiodSec = Number(process.env.LOCAL_CACHE_CHECK_PERIOD_SEC || 30);
const stdTTLSec = Number(process.env.LOCAL_CACHE_TTL_SEC || 300);

const listCache = new NodeCache({stdTTL: stdTTLSec, checkperiod: checkperiodSec , useClones: false});

export abstract class LocalCache {

    private static setNodeCache(key: string) {
        const nodeCache = new NodeCache({stdTTL: stdTTLSec, checkperiod: checkperiodSec});
        // nodeCache.on("set", function (field, value) {
        //     log('nodeCache:set', LogLevel.trace, {key, field, value})
        // });
        //
        // nodeCache.on("expired", function (field, value) {
        //     log('nodeCache:expired', LogLevel.trace, {key, field, value})
        // });

        return listCache.set(key, nodeCache);
    }

    private static fetchNodeCache(key: string, options?: { createIfNotExist: boolean }) {
        if (!listCache.has(key)) {
            if (options?.createIfNotExist) {
                if (!this.setNodeCache(key)) {
                    throw new Error("NodeCache did not success to set key");
                }
            }
        }
        return listCache.get<NodeCache>(key);
    }

    public static set<T>(key: string, fieldName: string, fieldValue: T, ttlSec = 60) {
        const cachedKey = this.fetchNodeCache(key, {createIfNotExist: true});
        if (cachedKey) {
            if (ttlSec > stdTTLSec) {
                ttlSec = stdTTLSec;
            }
            return cachedKey.set<T>(fieldName, fieldValue, ttlSec);
        }
        return false;
    }

    public static mset<T = any>(key: string, pairs: { key: string, val: T, ttl?: number }[]) {
        const cachedKey = this.fetchNodeCache(key, {createIfNotExist: true});
        if (cachedKey) {
            return cachedKey.mset<T>(pairs);
        }
        return false;
    }

    public static get<T>(key: string, fieldName: string) {
        const cachedKey = this.fetchNodeCache(key, {createIfNotExist: false});
        if (cachedKey) {
            return cachedKey.get<T>(fieldName);
        }
    }

    public static mget<T>(key: string, fieldsName: string[]) {
        const cachedKey = this.fetchNodeCache(key, {createIfNotExist: false});
        if (cachedKey) {
            return cachedKey.mget<T>(fieldsName);
        }
        return {};
    }

    public static getAllFields(key: string) {
        const cachedKey = this.fetchNodeCache(key, {createIfNotExist: false});
        if (cachedKey) {
            const fieldsName = cachedKey.keys();
            return this.mget<any>(key, fieldsName);
        }
        return {};
    }

    public static del(key: string, fieldsName: string | string[]) {
        const cachedKey = this.fetchNodeCache(key, {createIfNotExist: false});
        if (cachedKey) {
            return cachedKey.del(fieldsName);
        }
        return 0;
    }

}