import * as KoaRouter from "koa-router";
import { Root, Service, Type } from "protobufjs";

export class Router extends KoaRouter {

    public root: Root;

    constructor(options: KoaRouter.IRouterOptions & { root: Root }) {
        super(options);
        this.root = options.root;
    }

    public lookupService(serviceName: string): Service {
        try {
            return this.root.lookupService(serviceName);
        } catch {
            throw new TypeError(`Service "${serviceName}" not found on root`);
        }
    }

    public lookupType(typeName: string): Type {
        try {
            return this.root.lookupType(typeName);
        } catch {
            throw new TypeError(`Type "${typeName}" not found on root`);
        }
    }
}

export interface IRouterOptions extends KoaRouter.IRouterOptions {
    root: Root;
}
