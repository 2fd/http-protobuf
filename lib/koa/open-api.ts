import * as body from "koa-bodyparser";
import * as Router from "koa-router";
import {ISchemaObject} from "open-api.d.ts";
import * as pathToRegexp from "path-to-regexp";
import {Method, Reader, Root, Type} from "protobufjs";

import {Grpc, Http} from "../codes";
import {UnimplementedError} from "../errors/grpc/UnimplementedError";
import {HandleRequest} from "../handle-request";
import {Implementations} from "../interface";

export interface IRouterOptions extends Router.IRouterOptions {
    root: Root;
    services: string[];
    implementation: Implementations;
    jsonOptions?: object;
}

export interface IHandleRequestInfo {
    handleRequest: HandleRequest<any, any>;
    path: string;
    method: string;
}

export interface IResolvedHttpOptions {
    method: SupportedHttpMethod;
    path: string;
    body: string;
}

export type SupportedHttpMethod = "get" | "post" | "put" | "delete";

export class OpenApiRouter extends Router {

    public static ContentType = new Set([
        "application/json",
        "application/json-patch+json",
        "application/vnd.api+json",
        "application/csp-report",
        "application/x-www-form-urlencoded",
    ]);

    public static resolveOptions(options?: { [key: string]: any }): IResolvedHttpOptions | null {

        if (
            options && (
                options["google.api.http.get"] ||
                options["google.api.http.post"] ||
                options["google.api.http.put"] ||
                options["google.api.http.delete"]
            )
        ) {
            let method = "" as SupportedHttpMethod;
            let path = "";

            if (options["google.api.http.get"]) {
                method = "get";
                path = options["google.api.http.get"];

            } else if (options["google.api.http.post"]) {
                method = "post";
                path = options["google.api.http.post"];

            } else if (options["google.api.http.put"]) {
                method = "put";
                path = options["google.api.http.put"];
            } else {
                method = "delete";
                path = options["google.api.http.delete"];
            }

            return { method, path, body: options["google.api.http.body"] || ""};
        }

        return null;
    }

    public static resolveRequestObject(ctx: Router.IRouterContext, bodyPosition: string): object {
        let requestObject = Object.assign({}, ctx.params || null, ctx.query || null);
        switch (bodyPosition) {
            case "*":
                requestObject = Object.assign(requestObject, ctx.request.body);
                break;
            case "":
                // ignore
                break;
            default:
                requestObject[bodyPosition] = ctx.request.body;
                break;
        }

        return requestObject;
    }

    private handleRequests: IHandleRequestInfo[] = [];

    constructor(options: IRouterOptions) {
        super(options);

        if (!options.services) {
            throw new TypeError(`service option is required`);
        }

        this.use(body());
        options.services.forEach((serviceName) => {
            const service = options.root.lookupService(serviceName);

            if (!service) {
                throw new TypeError(`Service "${service}" not found on root`);
            }

            this.handleRequests = service.methodsArray.map((method: Method) => {
                if (typeof options.implementation[method.name] !== "function") {
                    throw new Error(`Method ${serviceName}.${method.name} is not implemented`);
                }

                const implementation = options.implementation[method.name];
                const requestType = options.root.lookupType(method.requestType);
                const responseType = options.root.lookupType(method.responseType);
                const handleRequest = new HandleRequest<any, any>(requestType, responseType, implementation);

                const http = OpenApiRouter.resolveOptions(method.options);

                if (!http) {
                    return null;
                }

                this[http.method](http.path, async (ctx, next) => {
                    if (!OpenApiRouter.ContentType.has(ctx.get("content-type"))) {
                        return next();
                    }

                    const requestObject = OpenApiRouter.resolveRequestObject(ctx, http.body);
                    const handleResponse = await handleRequest.handleObject(requestObject);

                    ctx.status = handleResponse.statusCode;
                    ctx.response.set("Status", String(handleResponse.status));
                    ctx.response.set("Status-Message", handleResponse.statusMessage);
                    if (handleResponse.status === 0) {
                        ctx.response.body = handleResponse.response;
                    }
                });

                return {
                    handleRequest,
                    method: http.method,
                    path: http.path,
                };
            })
            .filter((r) => r !== null) as IHandleRequestInfo[];
        });
    }

    public handles() {
        return this.handleRequests.slice();
    }
}
