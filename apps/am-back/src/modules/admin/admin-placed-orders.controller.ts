import { Auth } from '@am-back/core/guards/auth.guard';
import { Roles } from '@am-back/core/guards/role.guard';
import { UserRole } from '@am-back/db/entities/user.entity';
import { AdminPlacedOrdersService } from '@am-back/db/service/order/admin/admin-placed-orders.service';
import { AdminPlacedOrderActionsService } from '@am-back/db/service/order/admin/admin-placed-order-actions.service';
import type { AdminPlacedOrderFilters } from '@am-back/db/service/order/types/admin-placed-order-filters';
import type { RequestModel } from '@am-back/models/request.model';
import { ErrorsDto } from '@am-back/modules/errors/errors.dto';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiForbiddenResponse,
    ApiOkResponse,
    ApiQuery,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminPlacedOrdersQueryPipe } from './admin-placed-orders-query.pipe';
import {
    AdminPlacedOrderDetailsDto,
    AdminPlacedOrdersPageDto,
    AdminPlacedOrdersQueryDto,
    OrderActionDto,
} from './dto/admin-placed-order.dto';
import { OrderActionPipe } from './order-action.pipe';
import { OrderIdPipe } from './order-id.pipe';


@Controller('admin/orders')
@ApiTags('admin-placed-orders')
@Auth()
@Roles(UserRole.ADMIN)
@ApiUnauthorizedResponse({ type: ErrorsDto })
@ApiForbiddenResponse({ description: 'Требуется роль ADMIN' })
@ApiBadRequestResponse({
    type: ErrorsDto,
    description: 'Некорректные фильтры, причина, отсутствующий заказ или недопустимое состояние',
})
export class AdminPlacedOrdersController {
    /** Подключает безопасное чтение и административные действия над оформленными пользовательскими заказами. */
    constructor(
        private readonly orders: AdminPlacedOrdersService,
        private readonly actions: AdminPlacedOrderActionsService,
    ) {}

    /** Возвращает серверную страницу оформленных заказов всех пользователей; OPEN и административные корзины исключены. */
    @Get()
    @ApiQuery({ type: AdminPlacedOrdersQueryDto })
    @ApiOkResponse({ type: AdminPlacedOrdersPageDto })
    public list(
        @Query(AdminPlacedOrdersQueryPipe) filters: AdminPlacedOrderFilters,
    ): Promise<AdminPlacedOrdersPageDto> {
        return this.orders.list(filters);
    }

    /** Возвращает исторический snapshot, платежи, возвраты и административный аудит без секретов провайдера. */
    @Get(':id')
    @ApiOkResponse({ type: AdminPlacedOrderDetailsDto })
    public details(@Param('id', OrderIdPipe) id: number): Promise<AdminPlacedOrderDetailsDto> {
        return this.orders.details(id);
    }

    /** Отменяет ожидающий оплаты заказ; инициатор определяется только из проверенного контекста авторизации. */
    @Post(':id/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AdminPlacedOrderDetailsDto })
    public cancel(
        @Req() request: RequestModel,
        @Param('id', OrderIdPipe) id: number,
        @Body(OrderActionPipe) body: OrderActionDto,
    ): Promise<AdminPlacedOrderDetailsDto> {
        return this.actions.cancel(request.user.id, id, body.reason);
    }

    /** Принимает полный возврат; ответ с accepted/processing не является подтверждением финансового успеха. */
    @Post(':id/refund')
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ type: AdminPlacedOrderDetailsDto })
    public refund(
        @Req() request: RequestModel,
        @Param('id', OrderIdPipe) id: number,
        @Body(OrderActionPipe) body: OrderActionDto,
    ): Promise<AdminPlacedOrderDetailsDto> {
        return this.actions.refund(request.user.id, id, body.reason);
    }
}
