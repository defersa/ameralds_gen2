import { ModelState } from "../../abstract/abstract.model";
import { FindManyOptions } from "typeorm";


export const defaultActiveEntity: FindManyOptions = {
    where: {
        state: ModelState.ACTIVE,
    }
};
