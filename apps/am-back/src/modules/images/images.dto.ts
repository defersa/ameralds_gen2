import { ApiProperty } from "@nestjs/swagger";
import { EntityDto } from "../../common/common.dto";


export class ImageDto extends EntityDto {
    @ApiProperty({
        description: 'Name of image',
        type: 'string',
    })
    public name: string;

    @ApiProperty({
        description: 'Preview image path',
        type: 'string',
    })
    public preview: string;

    @ApiProperty({
        description: 'Full image path',
        type: 'string',
    })
    public full: string;
}

