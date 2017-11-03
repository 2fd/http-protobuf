import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class UnimplementedError extends GrpcError {
    public status = Grpc.Unimplemented;
    public statusCode = Http.NotImplemented;
}
