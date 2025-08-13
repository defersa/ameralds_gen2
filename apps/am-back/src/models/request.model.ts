import { Request as OuterRequest } from 'express';
import { UserEntity } from '../db/entities/user.entity';


export type RequestModel = {
    user: UserEntity,
} & OuterRequest;
