import { ApiEntityNames, ApiErrorCodes } from '@ameralds/utils';
import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { PatternsPaginatedFilters } from '@am-back/db/service/patterns/patterns-paginated-filters';


@Injectable()
export class PurchasedPatternsQueryPipe implements PipeTransform<Record<string, unknown>, PatternsPaginatedFilters> {
    /** Нормализует фильтры каталога; массив вместо строки поиска и некорректные ID отклоняет с INVALID. */
    public transform(query: Record<string, unknown>): PatternsPaginatedFilters {
        if (query['query'] !== undefined && typeof query['query'] !== 'string') {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID, entity: ApiEntityNames.PATTERN });
        }

        return {
            sizes: this.parseIds(query['sizes']),
            categories: this.parseIds(query['categories']),
            query: typeof query['query'] === 'string' ? query['query'] : '',
        };
    }

    /** Читает один либо несколько положительных целочисленных ID; пустые, составные и небезопасные значения запрещены. */
    private parseIds(value: unknown): number[] {
        if (value === undefined) {
            return [];
        }

        const values: unknown[] = Array.isArray(value) ? value : [value];

        if (values.length > 100) {
            throw new BadRequestException({ code: ApiErrorCodes.INVALID, entity: ApiEntityNames.PATTERN });
        }

        return values
            .map((id: unknown) => {
                if (typeof id !== 'string' || !/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) {
                    throw new BadRequestException({ code: ApiErrorCodes.INVALID, entity: ApiEntityNames.PATTERN });
                }

                return Number(id);
            });
    }
}
