import { NumberEntityDto } from '../../../common/common.dto';
import { ApiProperty } from '@nestjs/swagger';

export class PatternPriceDto {
    public patternId: number;
    public price: NumberEntityDto;
}

export class LocalCartDto {
    @ApiProperty({
        description: 'Price by pattern',
        type: PatternPriceDto,
        isArray: true,
    })
    public patterns: PatternPriceDto[];

    public totalPrice: NumberEntityDto;
}
