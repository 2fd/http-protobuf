import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class ResourceExhaustedError extends GrpcError {
    public status = Grpc.ResourceExhausted;
    public statusCode = Http.Forbidden;
}
