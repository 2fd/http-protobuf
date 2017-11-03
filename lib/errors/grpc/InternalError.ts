import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class InternalError extends GrpcError {
    public status = Grpc.Internal;
    public statusCode = Http.InternalServerError;
}
