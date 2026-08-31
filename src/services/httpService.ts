import axios, { AxiosRequestConfig, Method, ResponseType } from 'axios';

export interface HttpRequestOptions {
    method?: Method | string;
    url?: string;
    uri?: string;
    headers?: Record<string, any>;
    body?: any;
    data?: any;
    params?: any;
    timeout?: number;
    responseType?: ResponseType;
    rawResponse?: boolean;
    [key: string]: any;
}

export class HttpService {

    static async query<T = any>(options: HttpRequestOptions, auth_user?: string, auth_pass?: string): Promise<T> {
        const method = ((options.method || 'GET') as string).toUpperCase();
        const url = options.url || options.uri;
        const headers = options.headers ? { ...options.headers } : { 'Content-Type': 'application/json' };

        const config: AxiosRequestConfig = {
            ...options,
            method: method as Method,
            url,
            headers
        };

        if (options.body !== undefined) {
            config.data = options.body;
        } else if (options.data !== undefined) {
            config.data = options.data;
        }

        if (auth_user && auth_pass) {
            config.auth = {
                username: auth_user,
                password: auth_pass
            };
        }

        if (options.responseType) {
            config.responseType = options.responseType;
        }

        const response = await axios.request(config);
        if (options.rawResponse) {
            return response as unknown as T;
        }
        return (response && response.data !== undefined ? response.data : null) as T;
    }

    static async get<T = any>(url: string, options?: HttpRequestOptions, auth_user?: string, auth_pass?: string): Promise<T> {
        const reqOptions: HttpRequestOptions = {
            ...(options || {}),
            url,
            method: "GET"
        };
        return this.query<T>(reqOptions, auth_user, auth_pass);
    }

    static async post<T = any>(url: string, data?: any, options?: HttpRequestOptions, auth_user?: string, auth_pass?: string): Promise<T> {
        const reqOptions: HttpRequestOptions = {
            ...(options || {}),
            url,
            method: "POST",
            body: data
        };
        return this.query<T>(reqOptions, auth_user, auth_pass);
    }

    static async put<T = any>(url: string, data?: any, options?: HttpRequestOptions, auth_user?: string, auth_pass?: string): Promise<T> {
        const reqOptions: HttpRequestOptions = {
            ...(options || {}),
            url,
            method: "PUT",
            body: data
        };
        return this.query<T>(reqOptions, auth_user, auth_pass);
    }

    static async patch<T = any>(url: string, data?: any, options?: HttpRequestOptions, auth_user?: string, auth_pass?: string): Promise<T> {
        const reqOptions: HttpRequestOptions = {
            ...(options || {}),
            url,
            method: "PATCH",
            body: data
        };
        return this.query<T>(reqOptions, auth_user, auth_pass);
    }

    static async delete<T = any>(url: string, options?: HttpRequestOptions, auth_user?: string, auth_pass?: string): Promise<T> {
        const reqOptions: HttpRequestOptions = {
            ...(options || {}),
            url,
            method: "DELETE"
        };
        return this.query<T>(reqOptions, auth_user, auth_pass);
    }

    static async getDownLoadStream(url: string, options?: HttpRequestOptions, auth_user?: string, auth_pass?: string): Promise<any> {
        const reqOptions: HttpRequestOptions = {
            ...(options || {}),
            url,
            method: "GET",
            responseType: "stream"
        };
        return this.query(reqOptions, auth_user, auth_pass);
    }
}
