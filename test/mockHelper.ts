export function createMockRedisClient() {
    const kv = new Map<string, string>();
    const hashes = new Map<string, Map<string, string>>();
    const sets = new Map<string, Set<string>>();
    const zsets = new Map<string, Array<{ score: number; value: string }>>();

    const client: any = {
        on: jest.fn().mockReturnThis(),
        connect: jest.fn().mockImplementation(async () => client),
        quit: jest.fn().mockResolvedValue('OK'),
        disconnect: jest.fn().mockResolvedValue('OK'),

        set: jest.fn().mockImplementation(async (key: string, value: any) => {
            kv.set(key.toString(), value.toString());
            return 'OK';
        }),
        get: jest.fn().mockImplementation(async (key: string) => {
            return kv.get(key.toString()) ?? null;
        }),
        del: jest.fn().mockImplementation(async (key: string) => {
            const k = key.toString();
            let count = 0;
            if (kv.delete(k)) count++;
            if (hashes.delete(k)) count++;
            if (sets.delete(k)) count++;
            if (zsets.delete(k)) count++;
            return count > 0 ? 1 : 0;
        }),
        keys: jest.fn().mockImplementation(async (pattern: string) => {
            const allKeys = new Set([...kv.keys(), ...hashes.keys(), ...sets.keys(), ...zsets.keys()]);
            if (!pattern || pattern === '*') {
                return Array.from(allKeys);
            }
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return Array.from(allKeys).filter(k => regex.test(k));
        }),
        exists: jest.fn().mockImplementation(async (key: string) => {
            const k = key.toString();
            return (kv.has(k) || hashes.has(k) || sets.has(k) || zsets.has(k)) ? 1 : 0;
        }),
        setNX: jest.fn().mockImplementation(async (key: string, value: any) => {
            const k = key.toString();
            if (kv.has(k)) return false;
            kv.set(k, value.toString());
            return true;
        }),
        expire: jest.fn().mockResolvedValue(true),

        // Sorted Sets
        zAdd: jest.fn().mockImplementation(async (key: string, members: any) => {
            const k = key.toString();
            if (!zsets.has(k)) zsets.set(k, []);
            const arr = zsets.get(k)!;
            const items = Array.isArray(members) ? members : [members];
            for (const item of items) {
                const idx = arr.findIndex(m => m.value === item.value);
                if (idx >= 0) arr.splice(idx, 1);
                arr.push({ score: item.score, value: item.value });
            }
            arr.sort((a, b) => a.score - b.score);
            return items.length;
        }),
        zRem: jest.fn().mockImplementation(async (key: string, value: string) => {
            const k = key.toString();
            const arr = zsets.get(k);
            if (!arr) return 0;
            const idx = arr.findIndex(m => m.value === value);
            if (idx >= 0) {
                arr.splice(idx, 1);
                return 1;
            }
            return 0;
        }),
        zCard: jest.fn().mockImplementation(async (key: string) => {
            return zsets.get(key.toString())?.length || 0;
        }),
        zRange: jest.fn().mockImplementation(async (key: string) => {
            return (zsets.get(key.toString()) || []).map(m => m.value);
        }),
        zRangeWithScores: jest.fn().mockImplementation(async (key: string) => {
            return (zsets.get(key.toString()) || []).map(m => ({ score: m.score, value: m.value }));
        }),
        zPopMin: jest.fn().mockImplementation(async (key: string) => {
            const arr = zsets.get(key.toString());
            if (!arr || arr.length === 0) return null;
            return arr.shift() || null;
        }),
        zPopMax: jest.fn().mockImplementation(async (key: string) => {
            const arr = zsets.get(key.toString());
            if (!arr || arr.length === 0) return null;
            return arr.pop() || null;
        }),

        // Sets
        sAdd: jest.fn().mockImplementation(async (key: string, value: string | string[]) => {
            const k = key.toString();
            if (!sets.has(k)) sets.set(k, new Set<string>());
            const s = sets.get(k)!;
            const vals = Array.isArray(value) ? value : [value];
            let added = 0;
            for (const v of vals) {
                if (!s.has(v)) {
                    s.add(v);
                    added++;
                }
            }
            return added;
        }),
        sMembers: jest.fn().mockImplementation(async (key: string) => {
            return Array.from(sets.get(key.toString()) || []);
        }),
        sRem: jest.fn().mockImplementation(async (key: string, value: string | string[]) => {
            const s = sets.get(key.toString());
            if (!s) return 0;
            const vals = Array.isArray(value) ? value : [value];
            let removed = 0;
            for (const v of vals) {
                if (s.delete(v)) removed++;
            }
            return removed;
        }),
        sPop: jest.fn().mockImplementation(async (key: string, count?: number) => {
            const s = sets.get(key.toString());
            if (!s || s.size === 0) return count ? [] : null;
            const arr = Array.from(s);
            if (count && count > 1) {
                const popped = arr.slice(0, count);
                for (const p of popped) s.delete(p);
                return popped;
            }
            const popped = arr[0];
            s.delete(popped);
            return popped;
        }),
        sCard: jest.fn().mockImplementation(async (key: string) => {
            return sets.get(key.toString())?.size || 0;
        }),

        // Hashes
        hSet: jest.fn().mockImplementation(async (key: string, field: any, value?: any) => {
            const k = key.toString();
            if (!hashes.has(k)) hashes.set(k, new Map<string, string>());
            const h = hashes.get(k)!;
            if (value !== undefined) {
                h.set(field.toString(), value.toString());
                return 1;
            }
            if (field instanceof Map) {
                field.forEach((v, f) => h.set(f.toString(), v.toString()));
                return field.size;
            }
            if (Array.isArray(field)) {
                let count = 0;
                for (const item of field) {
                    if (Array.isArray(item)) {
                        h.set(item[0].toString(), item[1].toString());
                        count++;
                    }
                }
                return count;
            }
            if (typeof field === 'object' && field !== null) {
                for (const [f, v] of Object.entries(field)) {
                    h.set(f.toString(), (v as any).toString());
                }
                return Object.keys(field).length;
            }
            return 0;
        }),
        hSetNX: jest.fn().mockImplementation(async (key: string, field: string, value: any) => {
            const k = key.toString();
            if (!hashes.has(k)) hashes.set(k, new Map<string, string>());
            const h = hashes.get(k)!;
            const f = field.toString();
            if (h.has(f)) return false;
            h.set(f, value.toString());
            return true;
        }),
        hDel: jest.fn().mockImplementation(async (key: string, fields: any) => {
            const h = hashes.get(key.toString());
            if (!h) return 0;
            const fList = Array.isArray(fields) ? fields : [fields];
            let deleted = 0;
            for (const f of fList) {
                if (h.delete(f.toString())) deleted++;
            }
            return deleted;
        }),
        hExists: jest.fn().mockImplementation(async (key: string, field: string) => {
            return hashes.get(key.toString())?.has(field.toString()) ? 1 : 0;
        }),
        hGet: jest.fn().mockImplementation(async (key: string, field: string) => {
            return hashes.get(key.toString())?.get(field.toString()) ?? undefined;
        }),
        hGetAll: jest.fn().mockImplementation(async (key: string) => {
            const h = hashes.get(key.toString());
            if (!h) return {};
            const result: Record<string, string> = {};
            h.forEach((v, f) => { result[f] = v; });
            return result;
        }),
        hIncrBy: jest.fn().mockImplementation(async (key: string, field: string, increment: number) => {
            const k = key.toString();
            if (!hashes.has(k)) hashes.set(k, new Map<string, string>());
            const h = hashes.get(k)!;
            const f = field.toString();
            const curr = Number(h.get(f) || 0);
            const updated = curr + increment;
            h.set(f, updated.toString());
            return updated;
        }),
        hIncrByFloat: jest.fn().mockImplementation(async (key: string, field: string, increment: number) => {
            const k = key.toString();
            if (!hashes.has(k)) hashes.set(k, new Map<string, string>());
            const h = hashes.get(k)!;
            const f = field.toString();
            const curr = parseFloat(h.get(f) || '0');
            const updated = curr + increment;
            h.set(f, updated.toString());
            return updated;
        }),
        hKeys: jest.fn().mockImplementation(async (key: string) => {
            return Array.from(hashes.get(key.toString())?.keys() || []);
        }),
        hLen: jest.fn().mockImplementation(async (key: string) => {
            return hashes.get(key.toString())?.size || 0;
        }),
        hmGet: jest.fn().mockImplementation(async (key: string, fields: any) => {
            const h = hashes.get(key.toString());
            const fList = Array.isArray(fields) ? fields : [fields];
            return fList.map(f => h?.get(f.toString()) ?? null);
        }),
        hRandField: jest.fn().mockImplementation(async (key: string) => {
            const keys = Array.from(hashes.get(key.toString())?.keys() || []);
            return keys.length > 0 ? keys[0] : null;
        }),
        hRandFieldCount: jest.fn().mockImplementation(async (key: string, count: number) => {
            const keys = Array.from(hashes.get(key.toString())?.keys() || []);
            return keys.slice(0, Math.abs(count));
        }),
        hRandFieldCountWithValues: jest.fn().mockImplementation(async (key: string, count: number) => {
            const h = hashes.get(key.toString());
            if (!h) return {};
            const result: Record<string, string> = {};
            Array.from(h.entries()).slice(0, Math.abs(count)).forEach(([k, v]) => {
                result[k] = v;
            });
            return result;
        }),

        // Multi / Transaction
        multi: jest.fn().mockImplementation(() => {
            const queue: Array<() => Promise<any>> = [];
            const multiObj: any = {
                set: (k: string, v: any) => {
                    queue.push(() => client.set(k, v));
                    return multiObj;
                },
                expire: (k: string, ttl: number) => {
                    queue.push(() => client.expire(k, ttl));
                    return multiObj;
                },
                sAdd: (k: string, v: any) => {
                    queue.push(() => client.sAdd(k, v));
                    return multiObj;
                },
                hSet: (k: string, f: any, v?: any) => {
                    queue.push(() => client.hSet(k, f, v));
                    return multiObj;
                },
                exec: async () => {
                    const results: any[] = [];
                    for (const fn of queue) {
                        results.push(await fn());
                    }
                    return results;
                }
            };
            return multiObj;
        })
    };

    return client;
}

export function createMockAmqpConnection() {
    const queues = new Map<string, any[]>();
    const exchanges = new Set<string>();

    const mockChannel = {
        on: jest.fn(),
        close: jest.fn().mockImplementation((cb) => { if (cb) cb(); }),
        assertExchange: jest.fn().mockImplementation((name) => {
            exchanges.add(name);
            return true;
        }),
        assertQueue: jest.fn().mockImplementation((name, options, cb) => {
            if (!queues.has(name)) queues.set(name, []);
            if (cb) cb(null, { queue: name, messageCount: queues.get(name)?.length || 0 });
            return true;
        }),
        bindQueue: jest.fn().mockReturnValue(true),
        prefetch: jest.fn().mockReturnValue(true),
        checkQueue: jest.fn().mockImplementation((name, cb) => {
            if (name === 'queue_name_not_exist') {
                return cb({ code: 404, message: 'Queue not found' });
            }
            cb(null, { queue: name, messageCount: queues.get(name)?.length ?? 0 });
        }),
        checkExchange: jest.fn().mockImplementation((name, cb) => {
            cb(null, { exchange: name });
        }),
        sendToQueue: jest.fn().mockImplementation((name, content) => {
            if (!queues.has(name)) queues.set(name, []);
            queues.get(name)!.push(content);
            return true;
        }),
        publish: jest.fn().mockReturnValue(true),
        consume: jest.fn().mockImplementation((name, cb) => {
            return { consumerTag: 'tag-1' };
        }),
        get: jest.fn().mockImplementation((name, options, cb) => {
            if (name === 'queue_name_not_exist') {
                return cb({ code: 404 });
            }
            cb(null, { content: Buffer.from('test message') });
        }),
        purgeQueue: jest.fn().mockImplementation((name, cb) => {
            queues.set(name, []);
            if (cb) cb(null, { messageCount: 0 });
        }),
        deleteQueue: jest.fn().mockImplementation((name, cb) => {
            queues.delete(name);
            if (cb) cb(null, { messageCount: 0 });
        })
    };

    const mockConn = {
        on: jest.fn(),
        close: jest.fn().mockImplementation((cb) => { if (cb) cb(); }),
        createChannel: jest.fn().mockImplementation((cb) => cb(null, mockChannel))
    };

    return { mockConn, mockChannel };
}
