import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class AlreadyError extends GrpcError {
    public status = Grpc.AlreadyExists;
    public statusCode = Http.Conflict;
}
