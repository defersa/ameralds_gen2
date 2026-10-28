import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, of, switchMap, catchError } from 'rxjs';
import { ApiOrdersProducer, UserOrderDetailsDto } from '@am-front/root/api-v2';
import { AuthService } from '@am-front/services/auth.service';
import { LangService } from '@am-front/services/lang.service';
import { ImageListComponent } from '@am-front/shared/image-list/image-list.component';

@Component({
    selector: 'amstore-user-order-details',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DatePipe, RouterLink, ImageListComponent],
    template: `
        <section class="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6">
            <a routerLink="/account/profile">В личный кабинет</a>
            @if (loading()) {
                <p role="status">Загрузка заказа…</p>
            } @else if (order(); as details) {
                <header>
                    <h1>Заказ №{{ details.id }}</h1>
                    <p>Оформлен {{ details.createdAt | date:'dd.MM.yyyy HH:mm' }}</p>
                </header>
                @for (item of details.patterns; track item.id) {
                    <article class="flex min-w-0 flex-col gap-4 sm:flex-row">
                        @if (item.images.length) {
                            <div class="w-full shrink-0 sm:w-56"><amstore-image-list [images]="item.images" /></div>
                        }
                        <div class="min-w-0">
                            <h2>{{ item.name?.[lang()] || 'Схема недоступна' }}</h2>
                            <p>Размеры:
                                @for (size of item.sizes; track size.id) {
                                    {{ size.size?.value ?? 'Недоступен' }}{{ $last ? '' : ', ' }}
                                } @empty { не выбраны }
                            </p>
                            <p>Подбор: {{ item.color ? 'включён' : 'не выбран' }}</p>
                        </div>
                    </article>
                } @empty {
                    <p>В заказе нет схем.</p>
                }
            } @else {
                <p role="alert">Заказ недоступен. Проверьте ссылку и аккаунт, в который выполнен вход.</p>
            }
        </section>
    `,
})
export class OrderDetailsComponent {
    private readonly api = inject(ApiOrdersProducer);
    private readonly auth = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    public readonly lang = inject(LangService).lang;
    public readonly order = signal<UserOrderDetailsDto | null>(null);
    public readonly loading = signal(true);

    constructor() {
        combineLatest([this.route.paramMap, toObservable(this.auth.auth)]).pipe(
            switchMap(([params, authenticated]) => {
                this.order.set(null);
                this.loading.set(true);
                const id = Number(params.get('id'));
                return authenticated && Number.isSafeInteger(id) && id > 0
                    ? this.api.userOrdersControllerGetOrder(id).pipe(catchError(() => of(null)))
                    : of(null);
            }),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe(order => {
            this.order.set(order);
            this.loading.set(false);
        });
    }
}
