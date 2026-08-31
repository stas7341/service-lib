import NodeCache from "node-cache";

const checkperiodSec = Number(process.env.LOCAL_CACHE_CHECK_PERIOD_SEC || 30);
const stdTTLSec = Number(process.env.LOCAL_CACHE_TTL_SEC || 300);

const listCache = new NodeCache({ stdTTL: stdTTLSec, checkperiod: checkperiodSec, useClones: false });

// Clean up child NodeCache interval timers on deletion or expiration
listCache.on("del", (key: string, value: any) => {
    if (value && typeof value.close === 'function') {
        try { value.close(); } catch (e) { /* ignore */ }
    }
});

listCache.on("expired", (key: string, value: any) => {
    if (value && typeof value.close === 'function') {
        try { value.close(); } catch (e) { /* ignore */ }
    }
});

export abstract class LocalCache {

    private static setNodeCache(key: string): boolean {
        const nodeCache = new NodeCache({ stdTTL: stdTTLSec, checkperiod: checkperiodSec });
        return listCache.set(key, nodeCache);
    }

    private static fetchNodeCache(key: string, options?: { createIfNotExist: boolean }): NodeCache | undefined {
        if (!listCache.has(key)) {
            if (options?.createIfNotExist) {
                if (!this.setNodeCache(key)) {
                    throw new Error("NodeCache failed to set key");
                }
            }
        }
        return listCache.get<NodeCache>(key);
    }

    public static set<T>(key: string, fieldName: string, fieldValue: T, ttlSec = 60): boolean {
        const cachedKey = this.fetchNodeCache(key, { createIfNotExist: true });
        if (cachedKey) {
            if (ttlSec > stdTTLSec) {
                ttlSec = stdTTLSec;
            }
            return cachedKey.set<T>(fieldName, fieldValue, ttlSec);
        }
        return false;
    }

    public static mset<T = any>(key: string, pairs: { key: string, val: T, ttl?: number }[]): boolean {
        const cachedKey = this.fetchNodeCache(key, { createIfNotExist: true });
        if (cachedKey) {
            return cachedKey.mset<T>(pairs);
        }
        return false;
    }

    public static get<T>(key: string, fieldName: string): T | undefined {
        const cachedKey = this.fetchNodeCache(key, { createIfNotExist: false });
        if (cachedKey) {
            return cachedKey.get<T>(fieldName);
        }
        return undefined;
    }

    public static mget<T>(key: string, fieldsName: string[]): Record<string, T> {
        const cachedKey = this.fetchNodeCache(key, { createIfNotExist: false });
        if (cachedKey) {
            return cachedKey.mget<T>(fieldsName);
        }
        return {};
    }

    public static getAllFields(key: string): Record<string, any> {
        const cachedKey = this.fetchNodeCache(key, { createIfNotExist: false });
        if (cachedKey) {
            const fieldsName = cachedKey.keys();
            return this.mget<any>(key, fieldsName);
        }
        return {};
    }

    public static has(key: string, fieldName: string): boolean {
        const cachedKey = this.fetchNodeCache(key, { createIfNotExist: false });
        return cachedKey ? cachedKey.has(fieldName) : false;
    }

    public static getTTL(key: string, fieldName: string): number | undefined {
        const cachedKey = this.fetchNodeCache(key, { createIfNotExist: false });
        return cachedKey ? cachedKey.getTtl(fieldName) : undefined;
    }

    public static keys(key: string): string[] {
        const cachedKey = this.fetchNodeCache(key, { createIfNotExist: false });
        return cachedKey ? cachedKey.keys() : [];
    }

    public static del(key: string, fieldsName: string | string[]): number {
        const cachedKey = this.fetchNodeCache(key, { createIfNotExist: false });
        if (cachedKey) {
            return cachedKey.del(fieldsName);
        }
        return 0;
    }

    public static deleteCache(key: string): boolean {
        const cachedKey = listCache.get<NodeCache>(key);
        if (cachedKey && typeof cachedKey.close === 'function') {
            try { cachedKey.close(); } catch (e) { /* ignore */ }
        }
        return listCache.del(key) > 0;
    }

    public static clear(): void {
        const keys = listCache.keys();
        for (const key of keys) {
            this.deleteCache(key);
        }
        listCache.flushAll();
    }

    public static close(): void {
        this.clear();
        try { listCache.close(); } catch (e) { /* ignore */ }
    }
}