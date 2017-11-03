import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class DeadlineExceededError extends GrpcError {
    public status = Grpc.DeadlineExceeded;
    public statusCode = Http.RequestTimeout;
}
