import * as getPort from "get-port";
import * as Koa from "koa";
import * as protobufjs from "protobufjs";
import * as request from "supertest";

import { UnaryBufferRouter } from "./unary-buffer";

const proto = `
    syntax = "proto3";
    service TestService {
        rpc Action (ActionRequest) returns (ActionResponse);
    }

    message ActionRequest {
        uint32 random = 1;
    }

    message ActionResponse {
        uint32 randomNumber = 1;
        string randomString = 2;
    }
`;

interface IActionParams { random: number; }
interface IActionResponse { randomNumber: number; randomString: string; }
const root = protobufjs.parse(proto).root;

const implementation = {
    async Action(param: IActionParams): Promise<IActionResponse> {
        return {randomNumber: Number(param.random), randomString: String(param.random)};
    },
};

const router = new UnaryBufferRouter({
    implementation,
    root,
    services: ["TestService"],
});

describe(UnaryBufferRouter.name, () => {
    test(`Create router from service implementations`, async () => {
        const handles = router.handles();
        expect(handles.length).toEqual(1);
        expect(handles[0].method).toEqual("post");
        expect(handles[0].path).toEqual("/TestService/Action");
        expect(handles[0].handleRequest.requestType.name).toEqual("ActionRequest");
        expect(handles[0].handleRequest.responseType.name).toEqual("ActionResponse");
        expect(handles[0].handleRequest.implementation).toBe(implementation.Action);
    });

    test(`POST /{Service}/{Action}`, async () => {
        const app = new Koa();
        const requestBody = { random: Math.ceil(Math.random() * 127) };
        const requestType = root.lookupType("ActionRequest");
        const responseType = root.lookupType("ActionResponse");
        const raw = requestType.encode(requestType.create(requestBody)).finish();
        const port = await getPort();
        const server = app.use(router.routes()).listen(port);

        const response = await request(server)
            .post("/TestService/Action")
            .set("Content-Type", "application/protobuf")
            .send(raw.toString());

        server.close();

        expect(response.get("Status-Message")).toEqual("OK");
        expect(response.get("Status")).toEqual("0");
        expect(response.type).toEqual("application/grpc-web+proto");
        expect(response.status).toEqual(200);

        const responseDecoded = responseType.decode(Buffer.from(response.text, "utf8")).toJSON();
        const responseExpected = { randomNumber: requestBody.random, randomString: String(requestBody.random) };
        expect(responseDecoded).toEqual(responseExpected);
    });
});
