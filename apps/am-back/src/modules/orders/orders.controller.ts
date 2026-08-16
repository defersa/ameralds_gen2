import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ErrorsDto } from "../errors/errors.dto";
import { OrderService } from "@am-back/db/service/general/order.service";
import type { RequestModel } from "@am-back/models/request.model";
import { CartDto, InputShortOrderPatternDto } from './orders.dto';


@Controller('orders')
@ApiTags('orders')
export class OrdersController {
    constructor(
        private readonly orderService: OrderService,
    ) {
    }

    @Get('cart')
    @ApiCreatedResponse({ description: 'Cart returned.', type: CartDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async cart(
        @Req() request: RequestModel,
    ): Promise<CartDto> {
        return this.orderService.getUserCart(request.user);
    }

    @Patch('cart')
    @ApiBody({ type: [InputShortOrderPatternDto] })
    @ApiCreatedResponse({ description: 'Cart updated.', type: CartDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto})
    public async update(
        @Body() patterns: InputShortOrderPatternDto[],
        @Req() request: RequestModel,
    ): Promise<CartDto> {
        return await this.orderService.updateOpenUserOrder(request.user, patterns);
    }
}
