"use strict";
import fs from 'fs';
/**
* This is a wrapping class for microservices configuration management.
* Its serving all the cloud microservices to get their needed configurations.
*/

export enum TYPE
{
    STRING, BOOLEAN, NUMBER , OBJECT
}

export class ConfigManager{
   configurations: {} = {};
   private static instance: ConfigManager;
   private isInitialized: boolean;

   private constructor() {
        this.isInitialized = false;
   }

   static getInstance(): ConfigManager {
      if (!this.instance)
         this.instance = new ConfigManager();
      return this.instance as ConfigManager;
   }

    isInit = () => this.isInitialized;

   /**
    * Initialize the config ServiceInstanceInfo.
    * @param: configFilePath - path to configuration.
    * @param: environment - defining the environment to pull the configuration for , example : PRODUCTION , DEV , TEST. Default is DEV.
    */
   async init(configFilePath: string, environment?: string) : Promise<boolean> {
       if (environment) {
           process.env.NODE_ENV = environment;
       }
       ConfigManager.getInstance().configurations =
           ConfigManager.readConfigFile(configFilePath);
       this.isInitialized = true;
       return true;
   }

   private static readConfigFile(configFilePath: string, environment?: string) {
       // following code will require config file from `${filename}.ts` or `${filename}.json`
       // while .ts files are prioritized over .json files
       const fileName = environment ? environment : "default";
       const configPath = configFilePath ? configFilePath : "./config/" + fileName;

       // path inside require is always relative to the file in which you are calling it
       // following line will require the file as if it were required from the main js file
       // @ts-ignore
       const configFile = require.main.require(configPath);
       return configFile;
   }

    /**
    * A general purpose method getting the whole configuration for the given microservice.
     * */
    get Read() {
        this.isInit();

        const result = {};
        for (const k in this.configurations)
            result[k] = this.configurations[k];
        return result;
    }

    getAll(objKey: string = ""): object {
        this.isInit();
        return objKey === "" ? this.configurations : this.configurations[objKey];
    }

    /**
    * Get the content of a certain key in the microservice configuration. The value will be taken from the config object was initialized.
    * @param: key - a unique key of the configuration.
    */
    get(key: string, resultType: TYPE = TYPE.STRING): any {
        this.isInit();

        const keys = key.split('.');
        if (keys.length === 0)
            throw new Error(('Get config failed, bad parameter'));

        let val = this.configurations;
        for (const k of keys) {
            if (val[k] === undefined) {
                return undefined;
            }

            val = val[k];
        }
        return resultType === TYPE.STRING ? val.toString() :
            resultType === TYPE.OBJECT ? val :
            resultType === TYPE.NUMBER ? Number(val.toString()) : JSON.parse(val.toString());
    }

    set(key: string, value: any){
       this.configurations[key] = value;
   }
}
