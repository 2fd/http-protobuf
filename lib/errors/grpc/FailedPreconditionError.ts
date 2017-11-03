import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class FailedPreconditionError extends GrpcError {
    public status = Grpc.FailedPrecondition;
    public statusCode = Http.PreconditionFailed;
}
