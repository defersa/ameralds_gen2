import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { ErrorsDto } from "../errors/errors.dto";
import { OrderService } from "@am-back/db/service/general/order.service";
import type { RequestModel } from "@am-back/models/request.model";
import { CartDto, InputShortOrderPatternDto } from './dto/orders.dto';
import { NumberEntityDto } from '../../common/common.dto';
import { LocalCartDto } from './dto/local-cart.dto';
import { Auth } from '@am-back/core/guards/auth.guard';


@Controller('orders')
@ApiTags('orders')
export class OrdersController {
    constructor(private readonly orderService: OrderService) {}

    @Get('cart')
    @Auth()
    @ApiCreatedResponse({ description: 'Cart returned.', type: CartDto })
    @ApiBadRequestResponse({
        description: 'Something went wrong.',
        type: ErrorsDto,
    })
    public async cart(@Req() request: RequestModel): Promise<CartDto> {
        return this.orderService.getUserCart(request.user);
    }

    @Patch('cart')
    @Auth()
    @ApiBody({ type: [InputShortOrderPatternDto] })
    @ApiCreatedResponse({ description: 'Cart updated.', type: CartDto })
    @ApiBadRequestResponse({
        description: 'Something went wrong.',
        type: ErrorsDto,
    })
    public async update(
        @Body() patterns: InputShortOrderPatternDto[],
        @Req() request: RequestModel,
    ): Promise<CartDto> {
        return await this.orderService.updateOpenUserOrder(
            request.user,
            patterns,
        );
    }

    @Post('cart/local/price')
    @ApiBody({ type: [InputShortOrderPatternDto] })
    @ApiCreatedResponse({
        description: 'Cart price returned.',
        type: LocalCartDto,
    })
    @ApiBadRequestResponse({
        description: 'Something went wrong.',
        type: ErrorsDto,
    })
    public async localCartPrice(
        @Body() patterns: InputShortOrderPatternDto[],
    ): Promise<LocalCartDto> {
        return this.orderService.getLocalPrice(patterns);
    }
}
