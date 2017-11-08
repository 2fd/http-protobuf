import {Grpc, Http} from "../../codes";

export class GrpcError extends Error {
    public status: Grpc;
    public statusCode: Http;
    constructor(message: string, metadata: object | null = null) {
        super(message);
        Object.assign(this, metadata);
    }
}
