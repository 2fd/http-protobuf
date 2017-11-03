import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class PermissionDeniedError extends GrpcError {
    public status = Grpc.PermissionDenied;
    public statusCode = Http.Forbidden;
}
