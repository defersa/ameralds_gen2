import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from "@am-back/core/guards/role.guard";
import { UserRole } from "../../db/entities/user.entity";
import { ErrorsDto } from "../errors/errors.dto";
import { InputShortOrderPatternDto } from '../orders/dto/orders.dto';
import { AdminOrderResponseDto } from "./admin.dto";
import { AdminOrderService } from '@am-back/db/service/order/admin-order.service';


@Controller('admin/cart')
@ApiTags('admin')
@Roles(UserRole.ADMIN)
export class AdminCartController {
    constructor(
        private readonly adminOrderService: AdminOrderService,
    ) {
    }

    @Get()
    @ApiOkResponse({ description: 'Admin cart returned.', type: AdminOrderResponseDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto })
    public async lastOrder(): Promise<AdminOrderResponseDto> {
        return this.adminOrderService.getActualCart();
    }

    @Patch('add')
    @ApiBody({ type: InputShortOrderPatternDto })
    @ApiOkResponse({ description: 'Item added to admin cart.', type: AdminOrderResponseDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto })
    public async addItemToOrder(@Body() pattern: InputShortOrderPatternDto): Promise<AdminOrderResponseDto> {
        return this.adminOrderService.addToCart(pattern);
    }

    @Delete()
    @ApiOkResponse({ description: 'Admin cart cleared.' })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto })
    public async clearAll(): Promise<void> {
        return this.adminOrderService.clearCart();
    }

    @Delete(':id')
    @ApiOkResponse({ description: 'Item removed from admin cart.', type: AdminOrderResponseDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto })
    public async removeItemFromCart(@Param('id', ParseIntPipe) id: number): Promise<AdminOrderResponseDto> {
        return this.adminOrderService.removeFromCart(id);
    }
}
