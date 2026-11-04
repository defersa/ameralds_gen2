import { ApiEntityNames, ApiErrorCodes } from "@ameralds/utils";
import { ApiProperty } from "@nestjs/swagger";


export class ErrorsDto {
	@ApiProperty({
		description: "Code of error",
		enum: ApiErrorCodes,
		enumName: "EnumApiErrorCodes",
	})
	public code: ApiErrorCodes;

	@ApiProperty({
		description: "Error entity name",
		enum: ApiEntityNames,
		enumName: "EnumApiEntityNames",
	})
	public entity?: ApiEntityNames;
}
