import type { OpenAPIObject } from "@nestjs/swagger";


type ApiSchema = NonNullable<NonNullable<OpenAPIObject["components"]>["schemas"]>[string];
type SchemaObject = Exclude<ApiSchema, { $ref: string }>;

// ng-openapi учитывает nullable у примитивов, но теряет его у enum и allOf/$ref.
// Эквивалентные схемы OpenAPI 3.0 сохраняют null в сгенерированных TS-контрактах.
/**
 * Рекурсивно нормализует nullable в OpenAPI-схеме для enum и составных типов, сохраняя ссылки $ref без
 * изменений.
 */
function normalizeSchema(schema: ApiSchema): ApiSchema {
	if ("$ref" in schema) {
		return schema;
	}

	const result: SchemaObject = {
		...schema,
		...(schema.properties
			? {
				properties: Object.fromEntries(
					Object
						.entries(schema.properties)
						.map(([key, value]) => [key, normalizeSchema(value)]),
				),
			}
			: {}),
		...(schema.items
			? {
				items: normalizeSchema(schema.items),
			}
			: {}),
		...(schema.allOf
			? {
				allOf: schema.allOf
					.map(normalizeSchema),
			}
			: {}),
		...(schema.oneOf
			? {
				oneOf: schema.oneOf
					.map(normalizeSchema),
			}
			: {}),
		...(schema.anyOf
			? {
				anyOf: schema.anyOf
					.map(normalizeSchema),
			}
			: {}),
	};

	if (result.nullable && result.enum) {
		return {
			...result,
			enum: [...new Set([...result.enum, null])],
		};
	}

	if (result.nullable && (result.allOf || result.oneOf || result.anyOf)) {
		const nonNullable = {
			...result,
			nullable: false,
		};

		return {
			description: result.description,
			anyOf: [
				nonNullable,
				{
					type: "object",
					nullable: true,
					enum: [null],
				},
			],
		};
	}

	return result;
}

/**
 * Возвращает копию OpenAPI-документа с нормализованными nullable-схемами компонентов; документ без схем
 * оставляет без изменений.
 */
export function normalizeOpenApiNullability(document: OpenAPIObject): OpenAPIObject {
	if (!document.components?.schemas) {
		return document;
	}

	return {
		...document,
		components: {
			...document.components,
			schemas: Object.fromEntries(
				Object
					.entries(document.components?.schemas ?? {})
					.map(([key, schema]) => [
						key,
						normalizeSchema(schema),
					]),
			),
		},
	};
}
