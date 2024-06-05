import {amqpService, handlingMessage} from "../../lib/services/amqpService";
import {ConfigManager, TYPE} from "../../lib/services/configManager";
import {Message} from "../../lib/model/message";
import {Logger} from "../../lib/services/logger";

describe(`Unit Tests AMQP`, () => {
    const confMgr = ConfigManager.getInstance();
    let conf: any = {};
    let amqp: amqpService = amqpService.getInstance();

    beforeAll(async () => {
        await confMgr.init("../test.json", "");
        await Logger.getInstance().init(confMgr.get("Logger", TYPE.OBJECT));
        conf = confMgr.get("aqmp", TYPE.OBJECT);
    });

    afterAll(async () => {
        await amqp.close();
    });

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    test(`should fail subscribe amqpService not init`, async () => {
        try {
            if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
                jest.spyOn(amqp, 'subscribe').mockImplementationOnce(() => Promise.reject(new Error('Service amqpService is not initialized.')));
            }
            const result = await amqp.subscribe("", "", "queue_test", async () => true);
        } catch (error: any) {
            expect(error.message).toEqual(`Service amqpService is not initialized.`);
        }
    });

    test(`Initalized amqpService`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'init').mockResolvedValueOnce(true);
        }
        const result = await amqp.init(conf)
        expect(result).toBe(true);
    });

    test(`check if queue exists `, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'isQueueExist').mockResolvedValueOnce(true);
        }

        const queueName = 'queue_test';
        const isQueueExist = await amqp.isQueueExist(queueName);
        if(isQueueExist) {
            const result = await amqp.purgeQueue(queueName);
            expect(result).toBe(true);
        }
        else
            expect(true).toBe(true);
    });

    test(`create queue without subscribe`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'createQueue').mockResolvedValueOnce(true);
        }
        const queueName = 'queue_test';
        const result = await amqp.createQueue(queueName);
        expect(result).toBe(true);
    });

    test(`send message to queue`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'sendToQueue').mockResolvedValueOnce(undefined);
        }
        const msg: Message = {} as Message;
        msg.action = 'test1';
        msg.payload = {'key': 'value1', 'key2': 'value2'};

        await amqp.sendToQueue("queue_test", msg)
        expect(true).toBe(true);
    });

    test(`expect to get queue length`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'getQueueLength').mockResolvedValueOnce(1);
        }
        const size = await amqp.getQueueLength("queue_test");
        expect(size).toBe(1);
    });

    test(`expect to fail on getQueueLength`, async () => {
        try {
            if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
                jest.spyOn(amqp, 'getQueueLength').mockRejectedValueOnce({code: 404});
            }
            const size = await amqp.getQueueLength("queue_name_not_exist");
            throw new Error(`expected to fail because queue is not exists, but I guess it is`);
        } catch (err: any) {
            expect(err?.code).toEqual(404);
        }
    });

    test(`expect to fail on amqp.getMessage() with queueName that not exist`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'getMessage').mockRejectedValueOnce({code: 404});
        }
        try {
            await amqp.getMessage("queue_name_not_exist", 100);
            throw new Error(`expect to fail, instead of success`)
        } catch (err: any) {
            expect(err?.code).toEqual(404);
        }
    });

    test(`expect to purge queue`, async () => {

        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'getQueueLength').mockResolvedValueOnce(1);
            jest.spyOn(amqp, 'purgeQueue').mockResolvedValueOnce(undefined);
        }

        const queueName = 'queue_test';
        const currentSize = await amqp.getQueueLength(queueName);
        expect(currentSize).toEqual(1);
        // assert.equal(currentSize, 1, `expected to be one message in queue from test "send message to queue"`);
        await amqp.purgeQueue(queueName);

        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'getQueueLength').mockResolvedValueOnce(0);
        }
        const sizeAfterPurge = await amqp.getQueueLength(queueName);
        expect(sizeAfterPurge).toEqual(0);
    });

    test(`should subscribe to queue`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'subscribe').mockResolvedValueOnce(true);
        }

        const controller: handlingMessage = async (msg): Promise<boolean> => {
            const messageBody = msg.content.toString().trim();
            return true;
        };
        await amqp.subscribe("", "", "queue_test", controller);
        expect(true).toBe(true);
    });
});
