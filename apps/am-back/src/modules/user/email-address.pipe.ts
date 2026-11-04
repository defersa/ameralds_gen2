import { ApiErrorCodes } from "@ameralds/utils";
import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";


@Injectable()
export class EmailAddressPipe implements PipeTransform<unknown, string> {
	/**
	 * Проверяет формат и длину email, удаляет внешние пробелы и приводит адрес к нижнему регистру; неверный
	 * адрес вызывает INVALID_EMAIL.
	 */
	public transform(email: unknown): string {
		if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			throw new BadRequestException({
				code: ApiErrorCodes.INVALID_EMAIL,
			});
		}

		return email.trim().toLowerCase();
	}
}
