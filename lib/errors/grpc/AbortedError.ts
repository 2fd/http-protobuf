import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class AbortedError extends GrpcError {
    public status = Grpc.Aborted;
    public statusCode = Http.Conflict;
}
