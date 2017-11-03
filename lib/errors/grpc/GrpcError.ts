import {Grpc, Http} from "../../codes";

export class GrpcError extends Error {
    public status: Grpc;
    public statusCode: Http;
}