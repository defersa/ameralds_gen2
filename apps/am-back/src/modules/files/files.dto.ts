import { ApiProperty } from "@nestjs/swagger";
import { EntityDto } from "../../common/common.dto";


export class FileDto extends EntityDto {
    @ApiProperty({
        description: 'Name of file',
        type: 'string',
    })
    public name: string;

    @ApiProperty({
        description: 'File path',
        type: 'string',
    })
    public path: string;
}

