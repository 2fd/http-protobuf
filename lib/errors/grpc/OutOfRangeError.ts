import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class OutOfRangeError extends GrpcError {
    public status = Grpc.OutOfRange;
    public statusCode = Http.BadRequest;
}
