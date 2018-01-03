import * as protobufjs from "protobufjs";

import {Grpc, Http} from "./codes";

import {HandleRequest} from "./handle-request";

describe(HandleRequest.name, () => {
    const proto = `
        syntax = "proto3";
        service TestService {
            rpc Action (ActionRequest) returns (ActionResponse);
        }

        message ActionRequest {
            uint32 random = 1;
        }

        message ActionResponse {
            string random = 1;
        }
    `;

    interface IActionRequest { random: number; }
    interface IActionResponse { random: string; }
    const root = protobufjs.parse(proto).root;
    const requestType = root.lookupType("ActionRequest");
    const responseType = root.lookupType("ActionResponse");

    describe(HandleRequest.prototype.handle.name, () => {
        test(`create response from protobufjs.Message instance`, async () => {
            const handleRequest = new HandleRequest<IActionRequest, IActionResponse>(
                requestType,
                responseType,
                (req: IActionRequest): IActionResponse => {
                    return { random: String(req.random) };
                },
            );
            const random = Math.floor(Math.random() * Math.pow(2, 32));
            const requestMessage = requestType.create({ random });
            const responseMessage = await handleRequest.handle(requestMessage);

            expect(responseMessage.statusMessage).toEqual("OK");
            expect(responseMessage.statusCode).toEqual(Http.OK);
            expect(responseMessage.status).toEqual(Grpc.OK);
            expect(responseMessage.response).toBeInstanceOf(protobufjs.Message);

            const response = (responseMessage.response as protobufjs.Message<IActionResponse>).toJSON();
            expect(response.random).toBe(String(random));
        });

        test(`validate request and return message error`, async () => {
            const handleRequest = new HandleRequest<IActionRequest, IActionResponse>(
                requestType,
                responseType,
                (req: IActionRequest): IActionResponse => {
                    return { random: String(req.random) };
                },
            );

            const requestMessage = requestType.create({ random: "random" });
            const responseMessage = await handleRequest.handle(requestMessage);

            expect(responseMessage.statusMessage).toEqual("random: integer expected");
            expect(responseMessage.statusCode).toEqual(Http.BadRequest);
            expect(responseMessage.status).toEqual(Grpc.InvalidArgument);
            expect(responseMessage.response).toEqual(null);
        });

        test.skip(`validate response and return message error`, async () => {
            const handleRequest = new HandleRequest<IActionRequest, IActionResponse>(
                requestType,
                responseType,
                (req: IActionRequest): any => {
                    return { random: true };
                },
            );

            const requestMessage = requestType.create({ random: 1 });
            const responseMessage = await handleRequest.handle(requestMessage);

            expect(responseMessage.statusMessage).toEqual("random: string expected");
            expect(responseMessage.statusCode).toEqual(Http.InternalServerError);
            expect(responseMessage.status).toEqual(Grpc.Internal);
            expect(responseMessage.response).toEqual(null);
        });
    });

    describe(HandleRequest.prototype.handleObject.name, () => {
        test(`create response from Object instance`, async () => {
            const handleRequest = new HandleRequest<IActionRequest, IActionResponse>(
                requestType,
                responseType,
                (req: IActionRequest): IActionResponse => {
                    return { random: String(req.random) };
                },
            );
            const random = Math.floor(Math.random() * Math.pow(2, 32));
            const responseMessage = await handleRequest.handleObject({ random });

            expect(responseMessage.statusMessage).toEqual("OK");
            expect(responseMessage.statusCode).toEqual(Http.OK);
            expect(responseMessage.status).toEqual(Grpc.OK);
            expect(responseMessage.response).toEqual({ random: String(random) });
        });

        test.skip(`validate request and return message error`, async () => {
            const handleRequest = new HandleRequest<IActionRequest, IActionResponse>(
                requestType,
                responseType,
                (req: IActionRequest): IActionResponse => {
                    return { random: String(req.random) };
                },
            );

            const responseMessage = await handleRequest.handleObject({ random: "random" });
            expect(responseMessage.statusMessage).toEqual("random: integer expected");
            expect(responseMessage.statusCode).toEqual(Http.BadRequest);
            expect(responseMessage.status).toEqual(Grpc.InvalidArgument);
            expect(responseMessage.response).toEqual(null);
        });

        test.skip(`validate response and return message error`, async () => {
            const handleRequest = new HandleRequest<IActionRequest, IActionResponse>(
                requestType,
                responseType,
                (req: IActionRequest): any => {
                    return { random: true };
                },
            );

            const responseMessage = await handleRequest.handleObject({ random: 1 });

            expect(responseMessage.statusMessage).toEqual("random: string expected");
            expect(responseMessage.statusCode).toEqual(Http.InternalServerError);
            expect(responseMessage.status).toEqual(Grpc.Internal);
            expect(responseMessage.response).toEqual(null);
        });
    });

    describe(HandleRequest.prototype.handleBuffer.name, () => {
        test(`create response from Buffer instance`, async () => {
            const handleRequest = new HandleRequest<IActionRequest, IActionResponse>(
                requestType,
                responseType,
                (req: IActionRequest): IActionResponse => {
                    return { random: String(req.random) };
                },
            );
            const random = Math.floor(Math.random() * Math.pow(2, 3));
            const requestMessage = Buffer.from([8, random]);
            const responseMessage = await handleRequest.handleBuffer(requestMessage);

            expect(responseMessage.statusMessage).toEqual("OK");
            expect(responseMessage.statusCode).toEqual(Http.OK);
            expect(responseMessage.status).toEqual(Grpc.OK);
            expect(responseMessage.response).toBeInstanceOf(Buffer);
            expect(responseMessage.response).toEqual(Buffer.from([10, 1, String(random).charCodeAt(0)]));
        });

        test(`validate request and return message error`, async () => {
            const handleRequest = new HandleRequest<IActionRequest, IActionResponse>(
                requestType,
                responseType,
                (req: IActionRequest): IActionResponse => {
                    return { random: String(req.random) };
                },
            );

            const responseMessage = await handleRequest.handleBuffer(Buffer.from([8]));
            expect(responseMessage.statusMessage).toEqual("index out of range: 1 + 10 > 1");
            expect(responseMessage.statusCode).toEqual(Http.BadRequest);
            expect(responseMessage.status).toEqual(Grpc.InvalidArgument);
            expect(responseMessage.response).toEqual(null);
        });

        test.skip(`validate response and return message error`, async () => {
            const handleRequest = new HandleRequest<IActionRequest, IActionResponse>(
                requestType,
                responseType,
                (req: IActionRequest): any => {
                    return { random: true };
                },
            );
            const random = Math.floor(Math.random() * Math.pow(2, 3));
            const requestMessage = Buffer.from([8, random]);
            const responseMessage = await handleRequest.handleBuffer(requestMessage);

            expect(responseMessage.statusMessage).toEqual("random: string expected");
            expect(responseMessage.statusCode).toEqual(Http.InternalServerError);
            expect(responseMessage.status).toEqual(Grpc.Internal);
            expect(responseMessage.response).toEqual(null);
        });
    });
});
