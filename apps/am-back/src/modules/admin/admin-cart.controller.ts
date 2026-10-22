import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, StreamableFile } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiForbiddenResponse, ApiNoContentResponse, ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Roles } from "@am-back/core/guards/role.guard";
import { Auth } from '@am-back/core/guards/auth.guard';
import { UserRole } from "../../db/entities/user.entity";
import { ErrorsDto } from "../errors/errors.dto";
import { InputShortOrderPatternDto } from '../orders/dto/orders.dto';
import { AdminOrderDetailsDto, AdminOrderResponseDto, AdminOrdersPaginatedFilterDto, AdminOrdersPaginatedPageDto, CompleteAdminOrderDto } from "./admin.dto";
import { AdminOrderService } from '@am-back/db/service/order/admin-order.service';
import { FilesService } from '@am-back/db/service/files.service';
import { ParamsPaginatedDto } from '../../common/common.dto';
import { toString } from '@ameralds/utils';
import { extname } from 'path';


@Controller('admin/cart')
@ApiTags('admin')
@Auth()
@Roles(UserRole.ADMIN)
export class AdminCartController {
    constructor(
        private readonly adminOrderService: AdminOrderService,
        private readonly filesService: FilesService,
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

    @Get(':id')
    @ApiOkResponse({ description: 'Admin order with full pattern details returned.', type: AdminOrderDetailsDto })
    @ApiBadRequestResponse({ description: 'Admin order does not exist or its ID is invalid.', type: ErrorsDto })
    public async getAdminOrderById(@Param('id', ParseIntPipe) id: number): Promise<AdminOrderDetailsDto> {
        return this.adminOrderService.getAdminOrderById(id);
    }

    @Get(':id/download/:fileId')
    @Auth()
    @ApiProduces('application/pdf', 'application/octet-stream')
    @ApiOkResponse({
        description: 'CBB or PDF file from a completed admin order.',
        schema: { type: 'string', format: 'binary' },
    })
    @ApiBadRequestResponse({ description: 'Order is missing or incomplete, file is unavailable or is not a CBB/PDF file in the order.', type: ErrorsDto })
    @ApiForbiddenResponse({ description: 'An authenticated administrator is required.' })
    public async downloadOrderFile(
        @Param('id', ParseIntPipe) id: number,
        @Param('fileId', ParseIntPipe) fileId: number,
    ): Promise<StreamableFile> {
        const file = await this.adminOrderService.getAdminOrderFile(id, fileId);
        const stream = await this.filesService.getFileAsStream(file);
        const filename = encodeURIComponent(file.name).replace(/['()*]/g, (character) =>
            `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
        );

        return new StreamableFile(stream, {
            type: extname(file.name).toLowerCase() === '.pdf' ? 'application/pdf' : 'application/octet-stream',
            disposition: `attachment; filename*=UTF-8''${filename}`,
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

    @Post(':id/resend-email')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Completed admin order email resent using the configured mail service (dev only).' })
    @ApiBadRequestResponse({ description: 'Admin order does not exist, is incomplete, has no email or its ID is invalid.', type: ErrorsDto })
    public async resendOrderEmail(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.adminOrderService.resendOrderEmail(id);
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
