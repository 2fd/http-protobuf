import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class UnknownError extends GrpcError {
    public status = Grpc.Unknown;
    public statusCode = Http.InternalServerError;
}
