import { ApiProperty } from "@nestjs/swagger";


export class SuccessCreateDto {
    @ApiProperty({
        description: 'Id of created entity',
        type: 'string',
    })
    public id: number;
}

export class LabelEntityDto {
    @ApiProperty({
        description: 'Russian label',
        type: 'string',
    })
    public ru: string;

    @ApiProperty({
        description: 'English label',
        type: 'string',
    })
    public en: string;
}
