import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class NotFoundError extends GrpcError {
    public status = Grpc.NotFound;
    public statusCode = Http.NotFound;
}
