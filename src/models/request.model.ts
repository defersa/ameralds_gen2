import { Request as OuterRequest } from 'express';
import { UserEntity } from "@am/db/entities";


export type RequestModel = {
    user: UserEntity,
} & OuterRequest;
