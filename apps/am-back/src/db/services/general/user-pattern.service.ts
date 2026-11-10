import { ApiEntityNames, ApiErrorCodes } from '@ameralds/utils';
import { ModelState } from '@am-back/db/abstract/abstract.model';
import type { FileDto } from '@am-back/modules/files/files.dto';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { UserPatternRepository } from '../pattern-grants/repositories/user-pattern.repository';
import type { OwnedPatternSelection } from './pattern-purchase';


@Injectable()
export class UserPatternService {
    /** Подключает совместимое представление эффективных прав, обновляемое вместе с журналом оснований. */
    constructor(private readonly purchases: UserPatternRepository) {}

    /** Возвращает эффективные размеры и отдельное право цвета для нормализации корзины и checkout. */
    public async getBoughtSelections(userId: number, manager: EntityManager): Promise<OwnedPatternSelection[]> {
        const bought = await this.purchases.findOwned(userId, manager);

        return bought
            .map((item) => ({
                patternId: item.pattern.id,
                color: item.color,
                sizeIds: item.sizes
                    .filter((size) => size.state === ModelState.ACTIVE && size.size?.state === ModelState.ACTIVE &&
                        size.pattern?.id === item.pattern.id)
                    .map((size) => size.size.id),
            }));
    }

    /**
     * Возвращает только файл действующего размера либо цвет схемы при наличии действующего размера.
     * Проверяет владельца, активность каталога/файла и принадлежность размера схеме; отказ возвращает NOT_EXIST.
     * Цвет без размеров сохраняется как право, но его скачивание приостановлено до получения размера.
     */
    public async getPurchasedFile(userId: number, patternId: number, fileId: number): Promise<FileDto> {
        const owned = await this.purchases.findOwned(userId, undefined, patternId);

        const sizes = owned
            .flatMap((item) => item.sizes ?? [])
                .filter((size) => size.state === ModelState.ACTIVE && size.size?.state === ModelState.ACTIVE &&
                    size.pattern?.id === patternId && size.pattern.state === ModelState.ACTIVE);

        const files = sizes
            .flatMap((size) => [size.cbb, size.pdf, size.png]);

        if (sizes.length) {
            files.push(...owned
                .filter((item) => item.color)
                .map((item) => item.pattern.color));
        }

        const file = files
            .find((candidate) => candidate?.id === fileId && candidate.state === ModelState.ACTIVE);

        if (file) {
            return {
                id: file.id,
                name: file.name,
                path: file.path,
            };
        }

        throw new BadRequestException({
            code: ApiErrorCodes.NOT_EXIST,
            entity: ApiEntityNames.FILE,
        });
    }
}
