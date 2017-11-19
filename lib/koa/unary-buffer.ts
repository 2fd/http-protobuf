import * as KoaRouter from "koa-router";
import {Method, Reader, Root, Type} from "protobufjs";
import * as raw from "raw-body";

import {Implementations} from "../../interface";
import {Grpc, Http} from "../codes";
import {UnimplementedError} from "../errors/grpc/UnimplementedError";
import {HandleRequest} from "../handle-request";
import * as router from "./router";

export interface IRouterOptions extends router.IRouterOptions {
    services: string[];
    implementation: Implementations;
}

export interface IHandleRequestInfo {
    handleRequest: HandleRequest<any, any>;
    path: string;
    prefix: string;
    method: string;
}

export class UnaryBufferRouter extends router.Router {

    public static async BodyParser(ctx: KoaRouter.IRouterContext): Promise<Buffer> {
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
            const service = this.lookupService(serviceName);
            this.handleRequests = service.methodsArray.map((method: Method) => {
                if (typeof options.implementation[method.name] !== "function") {
                    throw new Error(`Method ${serviceName}.${method.name} is not implemented`);
                }

                const path = `/${service.fullName}/${method.name}`;
                const implementation = options.implementation[method.name];
                const requestType = this.lookupType(method.requestType);
                const responseType = this.lookupType(method.responseType);
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
                    prefix: options.prefix || "",
                };
            });
        });

        this.all("/", (ctx) => {
            if (ctx.method.toLowerCase() !== "post") {
                ctx.status = Http.MethodNotAllowed;
                ctx.response.set("Status", String(Grpc.NotFound));
                ctx.response.set("Status-Message", `Invalid HTTP request: Method ${ctx.method} is not allowed`);
            } else {
                ctx.status = Http.NotFound;
                ctx.response.set("Status", String(Grpc.NotFound));
                ctx.response.set("Status-Message", `Invalid HTTP request: Path ${ctx.path} is not a service`);
            }
        });
    }

    public handles() {
        return this.handleRequests.slice();
    }
}
