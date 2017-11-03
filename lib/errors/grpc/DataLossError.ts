import {Grpc, Http} from "../../codes";

import {GrpcError} from "./GrpcError";

export class DataLossError extends GrpcError {
    public status = Grpc.DataLoss;
    public statusCode = Http.InternalServerError;
}
