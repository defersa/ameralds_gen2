import { DestroyRef, effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { filter } from 'rxjs/operators';
import { ProfileService } from '@am-front/services/profile.service';
import {
    AdminOrderDto,
    AdminOrderPatternDto,
    AdminOrderPatternSizeDto,
    ApiAdminProducer,
    InputShortOrderPatternDto, NumberEntityDto,
    type PatternWithPriceDto
} from '@am-front/root/api-v2';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { IdRecord } from '@am-front/interface/common.interface';
import { ICartPattern } from '@am-front/services/cart/cart.service';
import { DEFAULT_CART_PRICE } from '@am-front/services/cart/default.data';


@Injectable({
    providedIn: 'root'
})
export class AdminCartService {
    private profileService: ProfileService = inject(ProfileService);
    private adminProducer: ApiAdminProducer = inject(ApiAdminProducer);
    private destroyRef: DestroyRef = inject(DestroyRef);

    public readonly cart: WritableSignal<AdminOrderDto> = signal(null);
    public readonly price: WritableSignal<NumberEntityDto> = signal(null);

    constructor() {
        effect(() => {
            if (!this.profileService.isAdmin()) {
                this.cart.set(null);
                this.price.set(DEFAULT_CART_PRICE);

                return;
            }

            this.getActualAdminCart()
        });
    }

    public getActualAdminCart(): void {
        this.price.set(null);

        this.adminProducer.adminControllerLastOrder()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((order: AdminOrderDto) => this.order.set(order));

    }

    public addPattern(pattern: ICartPattern, origin: PatternWithPriceDto): void {
        const order: AdminOrderDto = this.order();
        const previousPatterns: InputShortOrderPatternDto[] = order.patterns.map(this.convertOrderPatternEntityToPatternPurchase);

        this.adminProducer.adminControllerUpdateLastOrder([
            ...previousPatterns,
            {
                requiresPatternPurchase: true,
                pattern: pattern.id,
                color: pattern.color,
                sizes: pattern.sizes,
            }
        ])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.getActualAdminCart());
    }

    public removePattern(id: number): void {
        const order: AdminOrderDto = this.order();
        const previousPatterns: InputShortOrderPatternDto[] = order.patterns.map(this.convertOrderPatternEntityToPatternPurchase);

        this.adminProducer.adminControllerUpdateLastOrder(
            previousPatterns.filter((pattern: InputShortOrderPatternDto) => pattern.pattern !== id),
        )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.getActualAdminCart());
    }

    private convertOrderPatternEntityToPatternPurchase(pattern: AdminOrderPatternDto): InputShortOrderPatternDto {
        return {
            pattern: pattern.id,
            color: pattern.color,
            sizes: pattern.sizes.map((size: AdminOrderPatternSizeDto) => size.id),
            requiresPatternPurchase: true,
        };
    }
}
