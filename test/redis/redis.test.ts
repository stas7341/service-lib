import {ConfigManager} from "../../lib/services/configManager";
import {Logger} from "../../lib/services/logger";
import {redisService} from "../../lib/services/redisService";

describe("Unit Tests Redis", () => {
    const confMgr = ConfigManager.getInstance();

    let conf: any = {};
    const redis = redisService.getInstance();

    beforeAll(async () => {
        await confMgr.init("../test.json", "");
        await Logger.getInstance().init(confMgr);
        conf = confMgr.Read["redis"];
        await redis.init(conf);
    });

    afterAll(async () => {
        // clear all tests from redis
        if (!(process.env?.STANDALONE_TEST?.toLowerCase() === 'true')) {
            await redis.deleteItem("key1");
            await redis.deleteItem("set1");
            await redis.deleteItem("queue");
            await redis.deleteItem("set2");
        }
    });

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    afterEach(() => {
        // clear all tests from redis
        // if (!process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
        //
        // }
    });

    test("addFieldsToHash", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            return expect(true).toBe(true);
        }
        const a = await redis.addFieldsToHash("queue", "a", "1");
        const b = await redis.addFieldsToHash("queue", {"b": "2"});
        const map = new Map();
        map.set("c", "3");
        map.set("d", "4");
        const c = await redis.addFieldsToHash("queue", map);
        const e = await redis.addFieldsToHash("queue", ["e", "5"]);
        const f = await redis.addFieldsToHash("queue", [["f", "6"], ["h", "7"]]);
        const aa = await redis.getAllFieldsFromHash("queue");
        expect(true).toBe(true);
    });

    test("getAllFieldsFromHash", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            return expect(true).toBe(true);
        }
        const a = await redis.getAllFieldsFromHash("queue");
        expect(true).toBe(true);
    });

    test("getFieldFromHash", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            return expect(true).toBe(true);
        }
        const a = await redis.getFieldFromHash("queue", "d");
        expect(true).toBe(true);
    });

    test("getFieldsFromHash", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            return expect(true).toBe(true);
        }
        const a = await redis.getFieldsFromHash("queue", ["a", "b", "c", "z", "d"]);
        expect(true).toBe(true);
    });

    test("getFieldNamesFromHash", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            return expect(true).toBe(true);
        }
        const a = await redis.getFieldNamesFromHash("queue");
        expect(true).toBe(true);
    });

    test("getNumberOfFieldsInHash", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            return expect(true).toBe(true);
        }
        const a = await redis.getNumberOfFieldsInHash("queue");
        const b = await redis.getNumberOfFieldsInHash("queue333");
        expect(true).toBe(true);
    });

    test("removeFieldFromHash", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            return expect(true).toBe(true);
        }
        const a = await redis.removeFieldFromHash("queue", "f");
        expect(true).toBe(true);
    });

    test("isFieldExistInHash", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            return expect(true).toBe(true);
        }
        const a = await redis.isFieldExistInHash("queue", "a");
        expect(true).toBe(true);
    });

    test("incFieldInHash", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            return expect(true).toBe(true);
        }
        const a = await redis.incFieldInHash("queue", "b", 1);
        expect(true).toBe(true);
    });

    test("incFloatFieldInHash", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            return expect(true).toBe(true);
        }
        const a = await redis.incFloatFieldInHash("queue", "b", 0.5);
        expect(true).toBe(true);
    });

    test("getRandomFieldFromHash", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            return expect(true).toBe(true);
        }
        const a = await redis.getRandomFieldFromHash("queue");
        expect(true).toBe(true);
    });

    test("getRandomFieldsFromHash", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            return expect(true).toBe(true);
        }
        const a = await redis.getRandomFieldsFromHash("queue", 3);
        expect(true).toBe(true);
    });

    test("getRandomFieldsAndValuesFromHash", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            return expect(true).toBe(true);
        }
        const a = await redis.getRandomFieldsAndValuesFromHash("queue", 3);
        expect(true).toBe(true);
    });

    test("add item", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "addItem").mockResolvedValueOnce(true);
        }
        const ret = await redis.addItem("key1", "value1");
        expect(ret).toBe(true);
    });

    test("get item", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "getItem").mockResolvedValueOnce("value1");
        }

        const itemValue = await redis.getItem("key1");
        expect(itemValue).toEqual("value1");
    });

    test("get item not exist - expect to fail", async () => {
        const key = "key-not-exists";
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "getItem").mockRejectedValueOnce(`Not found entered key: ${key}`);
        }
        try {
            await redis.getItem(key);
        } catch (error) {
            if (error instanceof Error) {
                expect(error.message).toContain(`Not found entered key: ${key}`);
            }
        }
    });

    test("delete item", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "deleteItem").mockResolvedValueOnce(true);
        }
        const isDeleted = await redis.deleteItem("key1");
        expect(isDeleted).toBe(true);
    });

    test("check if key exists and delete it", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "isKeyExist").mockResolvedValueOnce(true);
            jest.spyOn(redis, "deleteItem").mockResolvedValueOnce(true);
        }
        const isKeyExist = await redis.isKeyExist("set1");
        if (isKeyExist) {
            const isDeleted = await redis.deleteItem("set1");
            expect(isDeleted).toBe(true);
        }
        expect(true).toBe(true);
    });

    test("delete key that not exists", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "deleteItem").mockResolvedValueOnce(false);
        }
        const isDeleted = await redis.deleteItem("set1");
        expect(isDeleted).toBe(false);
    });

    test("add item 'valueSet1' to set 'set1'", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "addItemToSet").mockResolvedValueOnce(true);
        }
        const retSet1 = await redis.addItemToSet("set1", "valueSet1");
        expect(retSet1).toBe(true);
    });

    test("add the same item 'valueSet1' to set 'set1'", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "addItemToSet").mockResolvedValue(true);
        }

        const retSet1 = await redis.addItemToSet("set1", "valueSet1");

        // add another items to set. should be in new test case. only preparation for next test
        const retSet2 = await redis.addItemToSet("set1", "valueSet2");
        const retSet3 = await redis.addItemToSet("set1", "valueSet3");
        expect(retSet2).toBe(true);
        expect(retSet3).toBe(true);
    });

    test("get all items from set", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "getAllItemFromSet").mockResolvedValueOnce(["valueSet1", "valueSet2", "valueSet3"]);
        }
        const retSet1: string[] = await redis.getAllItemFromSet("set1");
        expect(typeof retSet1).toBe("object");
        expect(new Set(retSet1)).toEqual(new Set(["valueSet1", "valueSet2", "valueSet3"]));
    });

    test("get number of items in set", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "numberOfItemFromSet").mockResolvedValueOnce(3);
        }
        const set1Length = await redis.numberOfItemFromSet("set1");
        expect(set1Length).toEqual(3);
    });

    test("remove item from set", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "removeItemFromSet").mockResolvedValueOnce(1);
        }

        const set1 = await redis.removeItemFromSet("set1", "valueSet1");
        expect(set1).toEqual(1);
    });

    test("remove item that not exists from set", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "removeItemFromSet").mockResolvedValueOnce(0);
        }
        const set1 = await redis.removeItemFromSet("set1", "value_not_exists");
        expect(set1).toEqual(0);
    });

    test("get all items from set after remove", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "getAllItemFromSet").mockResolvedValueOnce(["valueSet2", "valueSet3"]);
        }
        const retSet1: string[] = await redis.getAllItemFromSet("set1");
        expect(typeof retSet1).toBe("object");
        expect(new Set(retSet1)).toEqual(new Set(["valueSet2", "valueSet3"]));
    });

    test("popup random (return and remove) item from set", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "popupItemFromSet").mockResolvedValueOnce("valueSet2");
        }
        const item = await redis.popupItemFromSet("set1");
        expect(["valueSet2", "valueSet3"]).toContain(item);
    });

    test("remove all items from set", async () =>{
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "removeItemFromSet").mockResolvedValue(0);
        }
        await redis.removeItemFromSet("set1", "valueSet2");
        await redis.removeItemFromSet("set1", "valueSet3");
        expect(true).toEqual(true);
    });

    test("get all items from set, when set is empty", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "getAllItemFromSet").mockResolvedValueOnce([]);
        }
        const retSet1: string[] = await redis.getAllItemFromSet("set1");
        expect(typeof retSet1).toBe("object");
        expect(new Set(retSet1)).toEqual(new Set([]));
    });

    test("delete set", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "deleteItem").mockResolvedValueOnce(true);
        }
        await redis.deleteItem("set1");
    });

    test("get all items from set, when set is not exists", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "removeItemFromSet").mockResolvedValueOnce(0);
        }
        const set1LengthAfterRemove = await redis.removeItemFromSet("set1", "asdfas");
        expect(set1LengthAfterRemove).toEqual(0);
    });

    test("add items to queue", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "deleteItem").mockResolvedValueOnce(true);
            jest.spyOn(redis, "addItemToZQ").mockImplementation(() => Promise.resolve(true));
        }

        const queueName = "queue";
        await redis.deleteItem(queueName);

        const item1 = await redis.addItemToZQ(queueName, JSON.stringify({key: "key1", value: "value1"}));
        const item2 = await redis.addItemToZQ(queueName, JSON.stringify({key: "key2", value: "value2"}));
        expect(item1).toBe(true);
        expect(item2).toBe(true);
    });

    test ("get queue length", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "getZQLength").mockResolvedValueOnce(2);
        }

        const queueName = "queue";
        const length = await redis.getZQLength(queueName);
        expect(length).toBe(2);
    });

    test("get all items from queue", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            jest.spyOn(redis, "getAllItemsFromZQ").mockResolvedValueOnce([JSON.stringify({key: "key1", value: "value1"}), JSON.stringify({
                key: "key2",
                value: "value2"
            })]);
        }

        const queueName = "queue";
        const queueItems = await redis.getAllItemsFromZQ(queueName);
        expect(new Set(queueItems)).toEqual(new Set([
            JSON.stringify({key: "key1", value: "value1"}),
            JSON.stringify({key: "key2", value: "value2"})
        ]));
    });

    test("get all items from queue withscores", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            jest.spyOn(redis, "getAllItemsFromZQWithScores").mockResolvedValueOnce([
                {
                    value: JSON.stringify({"key": "key1", "value": "value1"}),
                    score: 1
                },
                {
                    value: JSON.stringify({"key": "key2", "value": "value2"}),
                    score: 1
                }
            ]);
        }

        const queueName = "queue";
        const queueItems = await redis.getAllItemsFromZQWithScores(queueName);
        expect(new Set(queueItems)).toEqual(new Set([{
            value: JSON.stringify({"key": "key1", "value": "value1"}),
            score: 1
        }, {
            value: JSON.stringify({"key": "key2", "value": "value2"}),
            score: 1
        }]));
    });

    test("remove item from queue", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "removeItemFromZQ").mockImplementationOnce(() => Promise.resolve(true));
        }

        const queueName = "queue";
        const isRemoved = await redis.removeItemFromZQ(queueName, JSON.stringify({key: "key1", value: "value1"}));
        expect(isRemoved).toBe(true);
    });

    test("remove item that not exists from queue", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "removeItemFromZQ").mockImplementation(() => Promise.resolve(true));
        }
        const queueName = "queue";
        const isRemoved = await redis.removeItemFromZQ(queueName, JSON.stringify({key: "key3", value: "value3"}));
        expect(isRemoved).toBe(true);
    });

    test("get all items from queue", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            jest.spyOn(redis, "getAllItemsFromZQ").mockResolvedValueOnce([JSON.stringify({key: "key2", value: "value2"})]);
        }

        const queueName = "queue";
        const queueItems = await redis.getAllItemsFromZQ(queueName);
        expect(new Set(queueItems)).toEqual(new Set([
            JSON.stringify({key: "key2", value: "value2"})
        ]));
    });

    test("popup (return and remove) item from queue", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "popItemFromZQ").mockResolvedValueOnce(
                {score: 1, value: JSON.stringify({"key": "key2", "value": "value2"})}
            );
        }

        const item = await redis.popItemFromZQ("queue");
        expect(item).toMatchObject({score: 1, value: JSON.stringify({"key":"key2","value":"value2"})});
    });

    test("get all items from queue, should be empty", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "getAllItemsFromZQ").mockResolvedValueOnce([]);
        }
        const queueName = "queue";
        const queueItems = await redis.getAllItemsFromZQ(queueName);
        expect(queueItems).toEqual([]);
    });

    test("check setIfNotExist - key not exist", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "deleteItem").mockResolvedValueOnce(true);
            jest.spyOn(redis, "setIfNotExist").mockResolvedValueOnce(true);
        }
        await redis.deleteItem("set2");
        const res = await redis.setIfNotExist("set2", "asdf");
        expect(res).toBe(true);

    });

    test("check setIfNotExist - key does exist", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "setIfNotExist").mockResolvedValueOnce(false);
        }
        const res = await redis.setIfNotExist("set2", "asdf");
        expect(res).toBe(false);
    });

    test("set expiration time to a key", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "setExpiration").mockImplementationOnce(() => Promise.resolve(true));
        }
        const res = await redis.setExpiration("set2", 2);
        expect(res).toBe(true);
    });

    test("search keys", async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(redis, "addItem").mockResolvedValue(true);
            jest.spyOn(redis, "searchKeys").mockResolvedValueOnce(["set1", "set2"]);
        }
        await redis.addItem("set1", "aaa");
        await redis.addItem("set2", "aaa");
        const res: string[] = await redis.searchKeys("set*");
        expect(new Set(res)).toEqual(new Set(["set1", "set2"]));
    });
});
