import {cacheRemoteConfig, RemoteCache} from "../../lib/utils/remoteCache";
import {Logger} from "../../lib/services/logger";
import {ConfigManager} from "../../lib/services/configManager";
import {redisService} from "../../lib/services/redisService";

describe(`Unit Tests for remote cache`, () => {
    let remoteCache: RemoteCache;
    beforeAll(async () => {
        await ConfigManager.getInstance().init("../test.json", "");
        await Logger.getInstance().init(ConfigManager.getInstance());
        const redisConf = ConfigManager.getInstance().Read["redis"];
        await redisService.getInstance().init(redisConf);

        const config: cacheRemoteConfig = {
            prefix: 'prefix',
            redis: redisService.getInstance(),
            expirationSec: 60
        };
        remoteCache = new RemoteCache(config);
        await remoteCache.delete('key');
        await remoteCache.delete('keySet');
        await remoteCache.delete('keyHSET');
    });

    afterAll(async () => {
        await remoteCache.delete('key');
        await remoteCache.delete('keySet');
        await remoteCache.delete('keyHSET');
    });

    test(`set and get the single key`, async () => {
        const setResult = await remoteCache.set('key', 'value', 30);
        expect(setResult).toEqual(true);
        const getResult = await remoteCache.get('key');
        expect(getResult).toEqual('value');
        const del = await remoteCache.delete('key');
        expect(del).toEqual(true);
    });

    test(`set and get to SET`, async () => {
        const setResult = await remoteCache.addItemToSet('keySet', 'value');
        expect(setResult).toEqual(true);
        const number = await remoteCache.numberOfItemFromSet('keySet');
        expect(number).toEqual(1);
        const getResult = await remoteCache.getAllItemsFromSet('keySet');
        expect(getResult).toEqual(['value']);
        const delResult = await remoteCache.delete('keySet');
        expect(delResult).toEqual(true);
    });

    test(`set and get to HSET`, async () => {
        const setResult = await remoteCache.addPairToHash('keyHSET', 'name', 'value');
        expect(setResult).toEqual(true);
        const getResult = await remoteCache.getFieldFromHash('keyHSET', 'name');
        expect(getResult).toEqual('value');
    });

    test(`multi operator`, async () => {
        const operator = remoteCache.getMultiOperator();
        await remoteCache.set('set1', 'value1', undefined, operator);
        await remoteCache.set('set2', 'value2', undefined, operator);
        await remoteCache.set('set3', 'value3', undefined, operator);
        const result  = await remoteCache.execMulti(operator);
        let getResult = await remoteCache.isKeyExist('set1');
        expect(getResult).toEqual(true);
        getResult = await remoteCache.isKeyExist('set2');
        expect(getResult).toEqual(true);
        getResult = await remoteCache.isKeyExist('set3');
        expect(getResult).toEqual(true);
    });
});
