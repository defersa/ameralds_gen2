import { InputShortOrderPatternDto } from '../../../modules/orders/dto/orders.dto';
import { getPatternPrice, PatternOrderForPriceModel } from '@ameralds/utils';
import { NumberEntityDto } from '../../../common/common.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ModelState } from '../../abstract/abstract.model';
import { AdminOrderEntity } from '../../entities/purchases/order.entity';
import { PrivateFileEntity } from '../../entities/files/file.entity';
import { ApiEntityNames, ApiErrorCodes } from '../../../modules/errors/errors.dto';


export function getOrderPrice(patters: PatternOrderForPriceModel[]): NumberEntityDto {
    return patters
        .map((pattern: PatternOrderForPriceModel) => getPatternPrice(pattern))
        .reduce((a: NumberEntityDto, b: NumberEntityDto) => ({
            en: a.en + b.en,
            ru: a.ru + b.ru,
        }), { en: 0, ru: 0 });
}

export function prepareCartPattern(
    item: InputShortOrderPatternDto,
): InputShortOrderPatternDto {
    return item.pattern && item.sizes?.length > 0 ? {
        pattern: item.pattern,
        requiresPatternPurchase: true,
        color: item.color,
        sizes: item.sizes,
    } : null;
}

export function getAdminOrderFiles(order: AdminOrderEntity): PrivateFileEntity[] {
    if (!order || order.state !== ModelState.ACTIVE) {
        throw new HttpException(
            { code: ApiErrorCodes.NOT_EXIST, entity: ApiEntityNames.CART },
            HttpStatus.BAD_REQUEST,
        );
    }

    if (!order.isComplete) {
        throw new HttpException(
            { code: ApiErrorCodes.INVALID, entity: ApiEntityNames.CART },
            HttpStatus.BAD_REQUEST,
        );
    }

    const files = (order.patterns ?? [])
        .filter((item) => item.state === ModelState.ACTIVE)
        .flatMap((item) => item.sizes ?? [])
        .filter((size) => size.state === ModelState.ACTIVE)
        .flatMap((size) => [size.cbb, size.pdf])
        .filter((file) => file?.state === ModelState.ACTIVE);

    return [...new Map(files.map((file) => [file.id, file])).values()];
}
