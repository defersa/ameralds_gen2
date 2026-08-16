import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from "@am-back/core/guards/role.guard";
import { OrderService } from "@am-back/db/service/general/order.service";
import { UserRole } from "../../db/entities/user.entity";
import { ErrorsDto } from "../errors/errors.dto";
import { InputShortOrderPatternDto } from '../orders/orders.dto';
import { AdminOrderResponseDto } from "./admin.dto";


@Controller('admin')
@ApiTags('admin')
export class AdminController {
    constructor(
        private readonly orderService: OrderService,
    ) {
    }

    @Get('cart')
    @Roles(UserRole.ADMIN)
    @ApiOkResponse({ description: 'Last admin order returned.', type: AdminOrderResponseDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto })
    public async lastOrder(): Promise<AdminOrderResponseDto> {
        return this.orderService.getLastAdminOrder();
    }

    @Patch('cart')
    @Roles(UserRole.ADMIN)
    @ApiBody({ type: [InputShortOrderPatternDto] })
    @ApiOkResponse({ description: 'Update last order from admin.', type: AdminOrderResponseDto })
    @ApiBadRequestResponse({ description: 'Something went wrong.', type: ErrorsDto })
    public async updateLastOrder(@Body() patterns: InputShortOrderPatternDto[]): Promise<AdminOrderResponseDto> {
        return this.orderService.updateAdminOrder(patterns);
    }
}
