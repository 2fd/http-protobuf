import * as body from "koa-bodyparser";
import * as KoaRouter from "koa-router";
import {
    IExternalDocumentationObject,
    IInfoObject, IOpenApiObject,
    ISecurityRequirementObject,
    IServerObject,
    ITagObject,
} from "open-api.d.ts";
import { Method, Reader, Root, Service, Type } from "protobufjs";
import { parse } from "qs";

import {Implementations} from "../../interface";
import {Grpc, Http} from "../codes";
import {UnimplementedError} from "../errors/grpc/UnimplementedError";
import { HandleRequest } from "../handle-request";
import * as router from "./router";

export interface IRouterOptions extends router.IRouterOptions {
    services: string[];
    implementation: Implementations;
    definitionEndpoint?: string;
    toObjectOptions?: object;
    customType?: {
        [protoType: string]: any,
    };
    openapi: {
        info: IInfoObject,
        servers?: IServerObject[],
        security?: ISecurityRequirementObject[],
        tags?: ITagObject[],
    };
}

export interface IHandleRequestInfo {
    handleRequest: HandleRequest<any, any>;
    prefix: string;
    path: string;
    method: string;
}

export interface IResolvedHttpOptions {
    method: SupportedHttpMethod;
    path: string;
    body: string;
}

export type SupportedHttpMethod = "get" | "post" | "put" | "delete";

export class OpenApiRouter extends router.Router {

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

    public static resolveRequestObject(ctx: KoaRouter.IRouterContext, bodyPosition: string): object {
        let requestObject = Object.assign({}, ctx.params || null, ctx.querystring ? parse(ctx.querystring) : null);
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
    private openapi: IOpenApiObject;

    constructor(options: IRouterOptions) {
        super(options);

        if (!options.services) {
            throw new TypeError(`service option is required`);
        }

        this.openapi = Object.assign(
            {
                openapi: "3.0.0",
                paths: {},
                tags: [],
            },
            options.openapi,
        );

        this.use(body());
        options.services.forEach((serviceName) => {
            const service = this.lookupService(serviceName);
            this.handleRequests = service.methodsArray.map((method: Method) => {
                if (typeof options.implementation[method.name] !== "function") {
                    throw new Error(`Method ${serviceName}.${method.name} is not implemented`);
                }

                const implementation = options.implementation[method.name];
                const requestType = this.lookupType(method.requestType);
                const responseType = this.lookupType(method.responseType);
                const handleRequest = new HandleRequest<any, any>(requestType, responseType, implementation);

                const http = OpenApiRouter.resolveOptions(method.options);

                if (!http) {
                    return null;
                }

                this.openapi.paths[http.path] = this.openapi.paths[http.path] || {};
                this.openapi.paths[http.path][http.method] = {
                    description: method.comment,
                };

                this[http.method](http.path, async (ctx, next) => {
                    const requestObject = OpenApiRouter.resolveRequestObject(ctx, http.body);
                    const handleResponse = await handleRequest.handleObject(
                        requestObject,
                        options.toObjectOptions || {},
                    );

                    ctx.status = handleResponse.statusCode;
                    ctx.response.set("Status", String(handleResponse.status));
                    ctx.response.set("Status-Message", handleResponse.statusMessage);
                    if (handleResponse.status === 0) {
                        ctx.response.body = handleResponse.response;
                    } else {
                        ctx.response.body = {
                            error: Grpc[handleResponse.status],
                            message: handleResponse.statusMessage,
                        };

                        throw (handleResponse.error || new Error(handleResponse.statusMessage));
                    }
                });

                return {
                    handleRequest,
                    method: http.method,
                    path: http.path,
                    prefix: options.prefix || "",
                };
            })
            .filter((r) => r !== null) as IHandleRequestInfo[];
        });

        if (options.definitionEndpoint) {
            const definitionEndpoint = typeof options.definitionEndpoint === "string" ?
                options.definitionEndpoint : "openapi.json";

            this.get("/" + options.definitionEndpoint, (ctx) => {
                ctx.status = 200;
                ctx.body = this.openApiDefinition();
            });
        }
    }

    public handles() {
        return this.handleRequests.slice();
    }

    public openApiDefinition() {
        return this.openapi;
    }
}
