import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { Body, Controller, Post, Req } from "@nestjs/common";
import { SuccessCreateDto } from "../../common/common.dto";
import { ErrorsDto } from "../errors/errors.dto";
import { OrderService } from "@am-back/db/service/general/order.service";
import type { RequestModel } from "@am-back/models/request.model";
import { InputShortOrderPatternDto } from "./orders.dto";


@Controller('orders')
@ApiTags('orders')
export class OrdersController {
    constructor(
        private readonly orderService: OrderService,
    ) {
    }

    @Post('update')
    @ApiBody({ type: [InputShortOrderPatternDto] })
    @ApiCreatedResponse({ description: 'The pattern successfully created.', type: SuccessCreateDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async update(
        @Body() patterns: InputShortOrderPatternDto[],
        @Req() request: RequestModel,
    ): Promise<SuccessCreateDto> {
        return await this.orderService.updateOpenUserOrder(request.user, patterns);
    }
}
