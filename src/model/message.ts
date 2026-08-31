export interface IMessage {
    validate(): boolean;
    toString(): string;
}

export class Message implements IMessage {
    public action: string;
    public payload: any;

    public constructor(action: string, payload?: any, initiator?: string) {
        this.action = action;
        const resolvedInitiator = initiator !== undefined ? initiator : process.env.npm_package_name;
        if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
            this.payload = { ...payload };
            if (this.payload.initiator === undefined) {
                this.payload.initiator = resolvedInitiator;
            }
        } else if (payload !== undefined) {
            this.payload = { data: payload, initiator: resolvedInitiator };
        } else {
            this.payload = { initiator: resolvedInitiator };
        }
    }

    toString(): string {
        return JSON.stringify(this);
    }

    validate(): boolean {
        if (typeof this.action !== "string" || this.action.length < 3) {
            return false;
        }
        if (typeof this.payload !== "object" || this.payload === null) {
            return false;
        }
        return true;
    }

    getPayload<T = any>(): T {
        return this.payload as T;
    }

    getData<T = any>(): T {
        if (this.payload && typeof this.payload === 'object' && 'data' in this.payload) {
            return this.payload.data as T;
        }
        return this.payload as T;
    }

    static clone(msg: Message): Message {
        return new Message(msg.action, msg.payload, msg.payload?.initiator);
    }

    static fromJSON(data: string | Record<string, any>): Message | null {
        try {
            if (!data) return null;
            const obj = typeof data === 'string' ? JSON.parse(data) : data;
            if (!obj || typeof obj !== 'object' || !obj.action) return null;
            const msg = new Message(obj.action, obj.payload, obj.payload?.initiator || obj.initiator);
            return msg;
        } catch {
            return null;
        }
    }
}
