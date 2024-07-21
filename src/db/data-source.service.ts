import { Injectable, Scope } from "@nestjs/common";
import { DataSource, EntityTarget, ObjectLiteral, Repository } from "typeorm";


@Injectable({
    scope: Scope.DEFAULT,
})
export class DataSourceService {
    constructor(public dataSource: DataSource) {
    }

    public getRepository<T extends ObjectLiteral>(target: EntityTarget<T>): Repository<T> {
        return this.dataSource.getRepository(target);
    }
}
