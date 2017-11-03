import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class UnauthenticatedError extends GrpcError {
    public status = Grpc.Unauthenticated;
    public statusCode = Http.Unauthorized;
}
