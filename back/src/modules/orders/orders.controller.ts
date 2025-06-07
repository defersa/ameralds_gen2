import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { Body, Controller, Post, Req } from "@nestjs/common";
import { SuccessCreateDto } from "../../common/common.dto";
import { ErrorsDto } from "../errors/errors.dto";
import { OrderService } from "@am/db/service/general/order.service";
import { RequestModel } from "@am/models/request.model";
import { ShortOrderPatternDto } from "./orders.dto";


@Controller('orders')
@ApiTags('orders')
export class OrdersController {
    constructor(
        private readonly orderService: OrderService,
    ) {
    }

    @Post('update')
    @ApiBody({ type: [ShortOrderPatternDto] })
    @ApiCreatedResponse({ description: 'The pattern successfully created.', type: SuccessCreateDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async update(
        @Body() patterns: ShortOrderPatternDto[],
        @Req() request: RequestModel,
    ): Promise<SuccessCreateDto> {
        return await this.orderService.updateOpenUserOrder(request.user, patterns);
    }
}
