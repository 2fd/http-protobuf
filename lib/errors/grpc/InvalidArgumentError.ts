import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class InvalidArgumentError extends GrpcError {
    public status = Grpc.InvalidArgument;
    public statusCode = Http.BadRequest;
}
