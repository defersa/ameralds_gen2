import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ErrorsDto } from "../errors/errors.dto";
import { OrderService } from "@am-back/db/service/order/order.service";
import type { RequestModel } from "@am-back/models/request.model";
import { CartDto, InputShortOrderPatternDto } from './dto/orders.dto';
import { NumberEntityDto } from '../../common/common.dto';
import { Auth } from '@am-back/core/guards/auth.guard';


@Controller('orders/cart')
@ApiTags('orders')
@Auth()
export class OrdersController {
    constructor(private readonly orderService: OrderService) {}

    @Get()
    @ApiOkResponse({ description: 'User cart returned.', type: CartDto })
    @ApiBadRequestResponse({
        description: 'Something went wrong.',
        type: ErrorsDto,
    })
    public async cart(@Req() request: RequestModel): Promise<CartDto> {
        return this.orderService.getUserCart(request.user);
    }

    @Patch('add')
    @ApiBody({ type: InputShortOrderPatternDto })
    @ApiOkResponse({ description: 'Item added to user cart.', type: CartDto })
    @ApiBadRequestResponse({
        description: 'Something went wrong.',
        type: ErrorsDto,
    })
    public async addItemToCart(
        @Body() pattern: InputShortOrderPatternDto,
        @Req() request: RequestModel,
    ): Promise<CartDto> {
        return this.orderService.addToUserCart(request.user, pattern);
    }

    @Patch('merge')
    @ApiBody({ type: [InputShortOrderPatternDto] })
    @ApiOkResponse({ description: 'Local cart merged with user cart.', type: CartDto })
    @ApiBadRequestResponse({
        description: 'Something went wrong.',
        type: ErrorsDto,
    })
    public async mergeLocalCart(
        @Body() patterns: InputShortOrderPatternDto[],
        @Req() request: RequestModel,
    ): Promise<CartDto> {
        return this.orderService.mergeLocalCartWithUserCart(request.user, patterns);
    }

    @Delete()
    @ApiOkResponse({ description: 'User cart cleared.', type: CartDto })
    @ApiBadRequestResponse({
        description: 'Something went wrong.',
        type: ErrorsDto,
    })
    public async clearAll(@Req() request: RequestModel): Promise<CartDto> {
        return this.orderService.clearUserCart(request.user);
    }

    @Delete(':id')
    @ApiOkResponse({ description: 'Item removed from user cart.', type: CartDto })
    @ApiBadRequestResponse({
        description: 'Something went wrong.',
        type: ErrorsDto,
    })
    public async removeItemFromCart(
        @Param('id', ParseIntPipe) id: number,
        @Req() request: RequestModel,
    ): Promise<CartDto> {
        return this.orderService.removeFromUserCart(request.user, id);
    }
}

@Controller('orders/cart/local')
@ApiTags('orders')
export class LocalCartController {
    constructor(private readonly orderService: OrderService) {}

    @Post('price')
    @ApiBody({ type: [InputShortOrderPatternDto] })
    @ApiOkResponse({
        description: 'Local cart price returned.',
        type: NumberEntityDto,
    })
    @ApiBadRequestResponse({
        description: 'Something went wrong.',
        type: ErrorsDto,
    })
    public async localCartPrice(
        @Body() patterns: InputShortOrderPatternDto[],
    ): Promise<NumberEntityDto> {
        return this.orderService.getLocalPrice(patterns);
    }
}
