import { Message, Reader, Type, util } from "protobufjs";
import { Grpc, Http } from "./codes";
import { InternalError } from "./errors/grpc/InternalError";
import { InvalidArgumentError } from "./errors/grpc/InvalidArgumentError";

import { ServiceImplementation } from "../interface";

export interface IHandleResponse<T> {
    status: Grpc;
    statusCode: Http;
    statusMessage: string;
    response: T | null;
    error: Error | null;
}

export class HandleRequest<Req extends object, Res extends object> {
    constructor(
        public requestType: Type,
        public responseType: Type,
        public implementation: ServiceImplementation<Req, Res>,
    ) {}

    public async handleBuffer(body: Buffer): Promise<IHandleResponse<Buffer>> {

        let request;
        try {
            request = this.requestType.decode(body);
        } catch (error) {
            return {
                error: new InvalidArgumentError(error.message),
                response: null,
                status: Grpc.InvalidArgument,
                statusCode: Http.BadRequest,
                statusMessage: error.message,
            };
        }

        const res = await this.handle(request);
        return {
            error: res.error,
            response: res.response ? new Buffer(this.responseType.encode(res.response).finish()) as any : null,
            status: res.status,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
        };
    }

    public async handleObject(body: object, options: object = {}): Promise<IHandleResponse<object>> {
        let request;
        try {
            request = this.requestType.fromObject(body);
        } catch (error) {
            return {
                error: new InvalidArgumentError(error.message),
                response: null,
                status: Grpc.InvalidArgument,
                statusCode: Http.BadRequest,
                statusMessage: error.message,
            };
        }

        const res = await this.handle(request);
        const opt = Object.assign(
                {
                enums: String,
                longs: String,
                oneofs: true,
            },
            options,
        );

        return {
            error: res.error,
            response: res.response ? this.responseType.toObject(res.response, opt) : null,
            status: res.status,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
        };
    }

    public async handle(request: Message<Req>): Promise<IHandleResponse<Message<Res>>> {
        const handleData: { requestObject: any, responseObject: any } = {
            requestObject: null,
            responseObject: null,
        };
        try {
            // Create and validate request
            const requestError = this.requestType.verify(request);
            if (requestError) {
                return {
                    error: new InvalidArgumentError(requestError),
                    response: null,
                    status: Grpc.InvalidArgument,
                    statusCode: Http.BadRequest,
                    statusMessage: requestError,
                };
            }
            const requestObject: any = request.toJSON();
            handleData.requestObject = requestObject;
            // Create and validate response
            const responseObject = await this.implementation(requestObject);
            handleData.responseObject = responseObject;
            const response = this.responseType.fromObject(responseObject);
            const responseError = this.responseType.verify(response);
            if (responseError) {
                return {
                    error: new InternalError(responseError, handleData),
                    response: null,
                    status: Grpc.Internal,
                    statusCode: Http.InternalServerError,
                    statusMessage: responseError,
                };
            }
            // Return response
            return {
                error: null,
                response,
                status: Grpc.OK,
                statusCode: Http.OK,
                statusMessage: "OK",
            };
        } catch (error) {
            // Catch unexpected errors
            return {
                error: Object.assign(error, handleData),
                response: null,
                status: error.status || Grpc.Unknown,
                statusCode: error.statusCode || Http.InternalServerError,
                statusMessage: error.message || "InternalError",
            };
        }
    }
}
