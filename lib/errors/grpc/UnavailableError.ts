import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class UnavailableError extends GrpcError {
    public status = Grpc.Unauthenticated;
    public statusCode = Http.ServiceUnavailable;
}
