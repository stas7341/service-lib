import {LocalCache} from "../../src/utils/localCache";

describe("Unit Tests for local cache", () => {
    beforeAll(async () => {
    });
    test("set and get the single key", () => {
        const setResult = LocalCache.set<string>("key", "fieldName", "fieldValue");
        expect(setResult).toEqual(true);
        const getResult = LocalCache.get("key", "fieldName");
        expect(getResult).toEqual("fieldValue");
    });

    test("set and get the multiple keys", () => {
        const obj1 = {11: 1, 12: 2};
        const obj2 = {21: 1, 22: 2};
        const setResult = LocalCache.mset<object>("key", [
            {key: "fieldName1", val: obj1}, {key: "fieldName2", val: obj2}
        ]);
        expect(setResult).toEqual(true);

    });

});
