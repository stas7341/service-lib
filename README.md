## Service implementation library
### All in-one: redis, mysql, logger, configuration and more

### Introduction
The (Service-lib) is a framework for building efficient, scalable Node.js server-side applications. It uses progressive JavaScript, is built with and fully supports TypeScript (yet still enables developers to code in pure JavaScript) and combines elements of OOP (Object Oriented Programming), FP (Functional Programming), and FRP (Functional Reactive Programming).

Service-lib provides a level of abstraction above these common Node.js libraries like amqp, redis and soon, but also exposes their APIs directly to the developer. This gives developers the freedom to use the myriad of third-party modules which are available for the underlying platform.

Service-lib provides an out-of-the-box application architecture which allows developers and teams to create highly testable, scalable, loosely coupled, and easily maintainable applications. 

While you can create a backend server or app solely in Node.js code, this library may significantly decrease the amount of code you have to write. If you are trying to look for a node js framework then you are at the right place. Here I have mentioned some of the most popular backend frameworks that developers can use. If you are looking for some of the most amazing node microservices framework then here you can find some of the best nodejs frameworks.


### Features

_amqpService_ - Auto queue declaration & binding, easy publishing, simple promise based API, auto reconnection/subscription in case of network failing

_configManager_ - Effective configuration management is crucial for BE development, particularly when building an application operating across various development, staging, and production environments.

_logger_ - A simple wrapper for winston, which provides basic JSON data format, easy to use. Recommended to AWS

_mySqlService_ - Mysql wrapper is created to solve the "Cannot enqueue Handshake after already enqueuing a Handshake" error of node-mysql and more

_redisService_ - The best wrapper, promise-based: we re-use the same code across a bunch of modules, hence this abstraction.

### Installation 📦
npm i @asmtechno/service-lib

### Example of use
[israel-queue-server](https://github.com/stas7341/israel-queue-server)
<br />
[iqlib](https://www.npmjs.com/package/@asmtechno/iqlib)
