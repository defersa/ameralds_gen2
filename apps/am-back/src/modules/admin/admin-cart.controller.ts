import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from "@am-back/core/guards/role.guard";
import { UserRole } from "../../db/entities/user.entity";
import { ErrorsDto } from "../errors/errors.dto";
import { InputShortOrderPatternDto } from '../orders/dto/orders.dto';
import { AdminOrderResponseDto, AdminOrdersPaginatedFilterDto, AdminOrdersPaginatedPageDto, CompleteAdminOrderDto } from "./admin.dto";
import { AdminOrderService } from '@am-back/db/service/order/admin-order.service';
import { ParamsPaginatedDto } from '../../common/common.dto';
import { toString } from '@ameralds/utils';


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

    @Get('list/:page')
    @ApiOkResponse({ description: 'Paginated admin orders returned.', type: AdminOrdersPaginatedPageDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto })
    public async page(
        @Param() params: ParamsPaginatedDto,
        @Query() filters: AdminOrdersPaginatedFilterDto,
    ): Promise<AdminOrdersPaginatedPageDto> {
        const startDate = toString(filters.startDate);
        const endDate = toString(filters.endDate);

        return this.adminOrderService.paginatedAdminOrder(Number(params.page), {
            email: toString(filters.email),
            vk: toString(filters.vk),
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        });
    }

    @Patch('add')
    @ApiBody({ type: InputShortOrderPatternDto })
    @ApiOkResponse({ description: 'Item added to admin cart.', type: AdminOrderResponseDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto })
    public async addItemToOrder(@Body() pattern: InputShortOrderPatternDto): Promise<AdminOrderResponseDto> {
        return this.adminOrderService.addToCart(pattern);
    }

    @Patch('complete')
    @ApiBody({ type: CompleteAdminOrderDto, required: false })
    @ApiOkResponse({ description: 'Admin order completed and a new cart opened.', type: AdminOrderResponseDto })
    @ApiBadRequestResponse({ description: 'Admin cart does not exist.', type: ErrorsDto })
    public async completeOrder(@Body() details: CompleteAdminOrderDto): Promise<AdminOrderResponseDto> {
        return this.adminOrderService.completeOrder(details);
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
