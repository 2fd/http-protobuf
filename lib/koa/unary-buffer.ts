import * as Router from "koa-router";
import {Method, Reader, Root, Type} from "protobufjs";
import * as raw from "raw-body";

import {Implementations} from "../../interface";
import {Grpc, Http} from "../codes";
import {UnimplementedError} from "../errors/grpc/UnimplementedError";
import {HandleRequest} from "../handle-request";

export interface IRouterOptions extends Router.IRouterOptions {
    root: Root;
    services: string[];
    implementation: Implementations;
}

export interface IHandleRequestInfo {
    handleRequest: HandleRequest<any, any>;
    path: string;
    method: string;
}

export class UnaryBufferRouter extends Router {

    public static async BodyParser(ctx: Router.IRouterContext): Promise<Buffer> {
        switch (ctx.request.type) {
            case "application/octet-stream":
            case "application/protobuf":
            case "application/x-protobuf":
            case "application/vnd.google.protobuf":
            // case "application/grpc+proto":
            case "application/grpc-web+proto":
                return raw(ctx.req);
            default:
                throw new UnimplementedError(`Unimplemented "Content-Type" parser for "${ctx.request.type}"`);
        }
    }

    private handleRequests: IHandleRequestInfo[] = [];

    constructor(options: IRouterOptions) {
        super(options);

        if (!options.services) {
            throw new TypeError(`service option is required`);
        }

        options.services.forEach((serviceName) => {
            const service = options.root.lookupService(serviceName);

            if (!service) {
                throw new TypeError(`Service "${service}" not found on root`);
            }

            this.handleRequests = service.methodsArray.map((method: Method) => {
                if (typeof options.implementation[method.name] !== "function") {
                    throw new Error(`Method ${serviceName}.${method.name} is not implemented`);
                }

                const path = `/${serviceName}/${method.name}`;
                const implementation = options.implementation[method.name];
                const requestType = options.root.lookupType(method.requestType);
                const responseType = options.root.lookupType(method.responseType);
                const handleRequest = new HandleRequest<any, any>(requestType, responseType, implementation);

                // Register path
                this.post(path, async (ctx) => {
                    ctx.response.type = "application/grpc-web+proto";
                    const body = await UnaryBufferRouter.BodyParser(ctx);
                    const handleResponse = await handleRequest.handleBuffer(body);

                    ctx.status = handleResponse.statusCode;
                    ctx.response.set("Status", String(handleResponse.status));
                    ctx.response.set("Status-Message", handleResponse.statusMessage);
                    if (handleResponse.status === 0) {
                        ctx.response.body = handleResponse.response;
                    } else {
                        throw (handleResponse.error || new Error(handleResponse.statusMessage));
                    }
                });

                return {
                    handleRequest,
                    method: "post",
                    path,
                };
            });
        });
    }

    public handles() {
        return this.handleRequests.slice();
    }
}
