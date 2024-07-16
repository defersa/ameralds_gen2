import { Injectable, Scope } from "@nestjs/common";
import { DataSource, EntityTarget, ObjectLiteral, Repository } from "typeorm";


@Injectable({
    scope: Scope.TRANSIENT,
})
export class DataSourceService {
    private dataSource: DataSource;

    constructor() {
        this.dataSource = new DataSource({
            type: "postgres",
        });
    }

    public getRepository<T extends ObjectLiteral>(target: EntityTarget<T>): Repository<T> {
        return this.dataSource.getRepository(target);
    }
}
