import * as getPort from "get-port";
import * as Koa from "koa";
import * as protobufjs from "protobufjs";
import * as request from "supertest";

import { OpenApiRouter } from "./open-api";

const proto = `
            syntax = "proto3";
            service TestService {
                rpc Action (ActionRequest) returns (ActionResponse) {
                    option google.api.http.get = "/v1/action/:random";
                };

                rpc CreateAction (CreateActionRequest) returns (ActionResponse) {
                    option google.api.http.post = "/v1/action";
                    option google.api.http.body = "*";
                };
            }

            message ActionRequest {
                string random = 1;
            }

            message CreateActionRequest {
                uint32 random = 1;
            }

            message ActionResponse {
                uint32 randomNumber = 1;
                string randomString = 2;
            }
        `;


interface IActionParams { random: string; }
interface IActionResponse { randomNumber: number; randomString: string; }
const root = protobufjs.parse(proto).root;

const implementation = {
    async Action(param: IActionParams): Promise<IActionResponse> {
        return { randomNumber: Number(param.random), randomString: String(param.random) };
    },
    async CreateAction(param: IActionParams): Promise<IActionResponse> {
        return { randomNumber: Number(param.random), randomString: String(param.random) };
    },
};

const router = new OpenApiRouter({
    implementation,
    root,
    services: ["TestService"],
});

describe(OpenApiRouter.name, () => {
    test(`Create router from service implementations`, async () => {
        const handles = router.handles();
        expect(handles.length).toEqual(2);
        expect(handles[0].method).toEqual("get");
        expect(handles[0].path).toEqual("/v1/action/:random");
        expect(handles[0].handleRequest.requestType.name).toEqual("ActionRequest");
        expect(handles[0].handleRequest.responseType.name).toEqual("ActionResponse");
        expect(handles[0].handleRequest.implementation).toBe(implementation.Action);
        expect(handles[1].method).toEqual("post");
        expect(handles[1].path).toEqual("/v1/action");
        expect(handles[1].handleRequest.requestType.name).toEqual("CreateActionRequest");
        expect(handles[1].handleRequest.responseType.name).toEqual("ActionResponse");
        expect(handles[1].handleRequest.implementation).toBe(implementation.CreateAction);
    });

    test(`GET "/v1/action/:random"`, async () => {
        const app = new Koa();
        const random = Math.ceil(Math.random() * 127);
        const port = await getPort();
        const server = app.use(router.routes()).listen(port);

        const response = await request(server)
            .get(`/v1/action/${random}`)
            .set("Content-Type", "application/json")
            .send();

        server.close();

        expect(response.get("Status-Message")).toEqual("OK");
        expect(response.get("Status")).toEqual("0");
        expect(response.type).toEqual("application/json");
        expect(response.status).toEqual(200);
        expect(response.text).toEqual(JSON.stringify({
            randomNumber: Number(random),
            randomString: String(random),
        }));
    });

    test(`POST "/v1/action"`, async () => {
        const app = new Koa();
        const random = Math.ceil(Math.random() * 127);
        const port = await getPort();
        const server = app.use(router.routes()).listen(port);

        const response = await request(server)
            .post(`/v1/action`)
            .set("Content-Type", "application/json")
            .send({random});

        server.close();

        expect(response.get("Status-Message")).toEqual("OK");
        expect(response.get("Status")).toEqual("0");
        expect(response.type).toEqual("application/json");
        expect(response.status).toEqual(200);
        expect(response.text).toEqual(JSON.stringify({
            randomNumber: Number(random),
            randomString: String(random),
        }));
    });
});
