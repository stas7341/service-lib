"use strict";
const axios = require('axios').default;

export class HttpService {

    static query(options, auth_user?, auth_pass?) {
        return new Promise((resolve, reject) => {
            try {
                const config: any = {
                    method: options.method || 'GET',
                    url: options.url || options.uri,
                    headers: options.headers || {'Content-Type': 'application/json'},
                    data: options.body || '{}'
                };

                if (auth_user && auth_pass) {
                    config.auth = {
                        username: auth_user,
                        password: auth_pass
                    };
                }

                axios.request(config).then(response => {
                    if (response && response.data)
                        resolve(response.data);
                    else
                        resolve(null);
                    return;
                }).catch (err => {
                    reject(err);
                    return;
                });
            }
            catch (err) {
                reject(err);
            }
        });
    }

    static async get(url: string, options?, auth_user?, auth_pass?) {
        const reqOptions: any = options || {};
        reqOptions.url = url;
        reqOptions.method = "GET";
        return this.query(reqOptions, auth_user, auth_pass);
    }

    static async post(url: string, data, options?, auth_user?, auth_pass?) {
        const reqOptions: any = options || {};
        reqOptions.url = url;
        reqOptions.method = "POST";
        reqOptions.body = data;
        return this.query(reqOptions, auth_user, auth_pass);
    }

    static getDownLoadStream(url: string, options?, auth_user?, auth_pass?): any {
        const reqOptions: any = options || {};
        reqOptions.url = url;
        reqOptions.method = "GET";
        return this.query(reqOptions, auth_user, auth_pass);
    }
}
