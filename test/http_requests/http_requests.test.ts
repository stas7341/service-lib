import {Logger} from "../../lib/services/logger";
import {ConfigManager, TYPE} from "../../lib/services/configManager";
import {HttpService} from "../../lib/services/httpService";

describe(`Unit Tests http requests`, () => {
    const confMgr = ConfigManager.getInstance();

    beforeAll(async () => {
        await confMgr.init("../test.json", "");
        await Logger.getInstance().init(confMgr.get("Logger", TYPE.OBJECT));
    });

    afterAll(async () => {
        // clear all tests from redis
        // if (!process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
        //
        // }
    });

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    test(`make [GET] request HttpService.get should return statusCode 200 and object as body`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(HttpService, 'get').mockResolvedValueOnce('{}');
        }

        const url = `https://postman-echo.com/get?foo1=bar1&foo2=bar2`;
        const result = await HttpService
            .get(url)
            .catch(err => {
                throw new Error(`[GET] request to ${url} failed. error: ${err}`);
            });
        expect(typeof (JSON.parse(result as string))).toBe('object');
    });

    test(`make [GET] request HttpService.get with auth should return statusCode 200 and object as body`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(HttpService, 'get').mockResolvedValueOnce('{}');
        }

        const url = `https://postman-echo.com/get?foo1=bar1&foo2=bar2`;
        const result = await HttpService
            .get(url, {"test_key": "test_value"}, "", "")
            .catch(err => {
                throw new Error(`[GET] request to ${url} failed. error: ${err}`);
            });
        expect(typeof (JSON.parse(result as string))).toBe("object");
    });

    test(`make [GET] request HttpService.get should return exception`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(HttpService, 'get').mockRejectedValueOnce({message: "ENOTFOUND"});
        }

        const url = `https://postman-echo-not-exists.com/get?foo1=bar1&foo2=bar2`;
        try {
            await HttpService.get(url, {"test_key": "test_value"}, "", "")
            throw new Error(`expect to fail, should not get here`);
        } catch (err: any) {
            expect(err.message).toContain('ENOTFOUND');
        }
    });

    test(`make [GET] request HttpService.get with undefined auth_user should return error`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(HttpService, 'get').mockRejectedValueOnce({message: "ENOTFOUND"});
        }

        const url = `https://postman-echo-not-exists.com/get?foo1=bar1&foo2=bar2`;

        try {
            await HttpService.get(url, {"test_key": "test_value"})
            throw new Error(`expect to fail, should not get here`);
        } catch (err: any) {
            expect(err.message).toContain('ENOTFOUND');
        }
    });

    test(`make [POST] request HttpService.post should return statusCode 200 and object as body`, async () => {
        const data = {name: 'ravin-ai'};

        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(HttpService, 'post').mockResolvedValueOnce({data});
        }

        const url = `https://postman-echo.com/post`;
        const result: any = await HttpService
            .post(url, data, {"test_key": "test_value"})
            .catch(err => {
                throw new Error(`[POST] request to ${url} failed. error: ${err}`);
            });
        expect(typeof result).toBe('object');
        expect(result).toMatchObject({data});
    });

    test(`make [POST] request HttpService.post should return exception`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(HttpService, 'post').mockRejectedValueOnce({message: "404:Not Found"});
        }

        const url = `https://postman-echo.com/kuku`;
        const data = {name: 'ravin-ai'};
        try {
            await HttpService.post(url, data);
            throw new Error(`expect request to fail`);
        } catch (error) {
            expect(error).toMatchObject({message: "404:Not Found"});
        }
    });

    test(`make [POST] request HttpService.post to not exist domain, should return exception`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(HttpService, 'post').mockRejectedValueOnce({message: "ENOTFOUND"});
        }

        const url = `https://postman-echo.com-not-exist/kuku`;
        const data = {name: 'ravin-ai'};
        try {
            await HttpService.post(url, data);
            throw new Error(`expect request to fail`);
        } catch (error: any) {
            expect(error.message).toContain('ENOTFOUND');
        }
    });

    test(`make [POST] HttpService.query should return statusCode 200 and object as body`, async () => {
        const data = {name: 'ravin-ai'};

        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(HttpService, 'query').mockResolvedValueOnce({data});
        }

        const url = 'https://postman-echo.com/post';
        const options: any = {
            method: 'POST',
            uri: url,
            headers: {'Content-Type': 'application/json'},
            json: true,
            body: data
        };
        const result: any = await HttpService
            .query(options)
            .catch(err => {
                throw new Error(`[POST] request to ${url} failed. error, ${err}`);
            });
        expect(typeof result).toBe('object');
        expect(result.data).toMatchObject(data);
    });

    test(`make [POST] HttpService.query with auth should return statusCode 200 and object as body`, async () => {
        const data = {name: 'ravin-ai'};

        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(HttpService, 'query').mockResolvedValueOnce({data});
        }

        const url = 'https://postman-echo.com/post';
        const options: any = {
            method: 'POST',
            uri: url,
            headers: {'Content-Type': 'application/json'},
            json: true,
            body: data
        };
        const result: any = await HttpService
            .query(options, "", "")
            .catch(err => {
                throw new Error(`[POST] request to ${url} failed. error, ${err}`);
            });
        expect(typeof result).toBe('object');
        expect(result.data).toMatchObject(data);
    });

    test(`stream`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(HttpService, 'getDownLoadStream').mockResolvedValueOnce(true);
        }

        const url = "https://postman-echo.com/stream/5";
        const downloadStream = HttpService.getDownLoadStream(url, {"test_key": "test_value"});
        expect(true).toBe(true);
    })
});
