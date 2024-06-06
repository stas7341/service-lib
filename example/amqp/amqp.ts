import {amqpService, handlingMessage} from "../../src/services/amqpService";
import {ConfigManager, TYPE} from "../../src/services/configManager";
import {Message} from "../../src/model/message";
import {Logger} from "../../src/services/logger";

const main = async() => {
    const confMgr = ConfigManager.getInstance();
    let conf: any = {};
    let amqp: amqpService = amqpService.getInstance();

    await confMgr.init("../test.json", "");
    await Logger.getInstance().init(confMgr.get("Logger", TYPE.OBJECT));
    conf = confMgr.get("aqmp", TYPE.OBJECT);

    let result = await amqp.init(conf);

    const queueName = 'queue_test';
    const isQueueExist = await amqp.isQueueExist(queueName);
    if (isQueueExist) {
        const result = await amqp.purgeQueue(queueName);
    }
    result = await amqp.createQueue(queueName);

    const msg: Message = {} as Message;
    msg.action = 'test1';
    msg.payload = {'key': 'value1', 'key2': 'value2'};

    await amqp.sendToQueue("queue_test", msg)

    const size = await amqp.getQueueLength("queue_test");

    const controller: handlingMessage = async (msg): Promise<boolean> => {
        const messageBody = msg.content.toString().trim();
        return true;
    };
    await amqp.subscribe("", "", "queue_test", controller);

    await amqp.close();
}

main().then(res => console.log('started'));




