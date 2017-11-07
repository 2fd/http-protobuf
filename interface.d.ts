export type Callback = (err?: Error) => void;
export type ServiceImplementation<Req, Res> = (req: Req) => Res;
export type Implementations = { [method: string]: ServiceImplementation<any, any> }
