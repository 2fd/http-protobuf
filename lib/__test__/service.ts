import {loadSync} from "protobufjs";
const path = __dirname + "/service.proto";
export default loadSync(path);
