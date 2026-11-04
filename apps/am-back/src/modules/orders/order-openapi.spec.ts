import type { OpenAPIObject } from "@nestjs/swagger";
import { normalizeOpenApiNullability } from "../../../../../tools/normalize-openapi-nullability";


describe("nullable order API contracts", () => {
	it("preserves nullable references, enums and nested snapshots without changing required contracts", () => {
		const document: OpenAPIObject = {
			openapi: "3.0.0",
			info: {
				title: "test",
				version: "1",
			},
			paths: {},
			components: {
				schemas: {
					Order: {
						type: "object",
						required: ["snapshot", "currency"],
						properties: {
							snapshot: {
								nullable: true,
								allOf: [{ $ref: "#/components/schemas/Item" }],
							},
							currency: {
								type: "string",
								nullable: true,
								enum: ["RUB", "USD"],
							},
							subtotalAmount: {
								type: "integer",
								nullable: true,
							},
							items: {
								type: "array",
								items: { $ref: "#/components/schemas/Item" },
							},
						},
					},
				},
			},
		};

		const normalized = normalizeOpenApiNullability(document);

		expect(normalized.components.schemas.Order).toMatchObject({
			required: ["snapshot", "currency"],
			properties: {
				snapshot: {
					anyOf: [
						{
							allOf: [{ $ref: "#/components/schemas/Item" }],
						},
						{
							enum: [null],
							nullable: true,
						},
					],
				},
				currency: {
					enum: ["RUB", "USD", null],
				},
				subtotalAmount: {
					type: "integer",
					nullable: true,
				},
				items: {
					items: { $ref: "#/components/schemas/Item" },
				},
			},
		});
		expect(document.components.schemas.Order).toMatchObject({
			properties: {
				currency: {
					enum: ["RUB", "USD"],
				},
			},
		});
	});
});
