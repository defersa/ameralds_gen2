import { OverlayContainer } from '@angular/cdk/overlay';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import { type AdminPlacedOrderDetailsDto } from '@am-front/root/api-v2';
import { AdminPlacedOrdersService } from '@am-front/services/admin-placed-orders.service';
import { AuthService } from '@am-front/services/auth.service';
import { ProfileService } from '@am-front/services/profile.service';
import { placedOrder } from '../order-fixture';
import { OrderActionDialog } from './order-action-dialog';


describe('placed order action confirmation', () => {
    const service = {
        act: jest.fn(),
    };
    const admin = signal(true);
    let dialogs: MatDialog;

    beforeEach(() => {
        admin.set(true);
        service.act.mockReset().mockReturnValue(of(placedOrder()));
        TestBed.configureTestingModule({
            imports: [OrderActionDialog],
            providers: [
                provideNoopAnimations(),
                {
                    provide: AdminPlacedOrdersService,
                    useValue: service,
                },
                {
                    provide: AuthService,
                    useValue: {
                        auth: signal(true),
                    },
                },
                {
                    provide: ProfileService,
                    useValue: { isAdmin: admin },
                },
            ],
        });
        dialogs = TestBed.inject(MatDialog);
    });

    afterEach(() => {
        dialogs.closeAll();
    });

    it('shows the full paid amount, access warning and validates the reason through the real control', async () => {
        const dialog = dialogs.open(OrderActionDialog, {
            data: {
                action: 'refund',
                order: placedOrder(),
            },
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
        TestBed.tick();

        const overlay = TestBed.inject(OverlayContainer).getContainerElement();
        const input = overlay.querySelector<HTMLInputElement>('input');

        expect(overlay.textContent).toContain('123.45');
        expect(overlay.textContent).toContain('купленный в другом заказе');
        dialog.componentInstance.submit(new Event('submit'));
        TestBed.tick();
        expect(service.act).not.toHaveBeenCalled();
        expect(overlay.textContent).toContain('Это поле обязательно');

        if (!input) {
            throw new Error('Expected reason input');
        }

        input.value = 'Полный возврат';
        input.dispatchEvent(new Event('input'));
        TestBed.tick();
        dialog.componentInstance.submit(new Event('submit'));
        expect(service.act).toHaveBeenCalledWith(7, 'refund', 'Полный возврат');
    });

    it('blocks duplicate submit and closing while pending, restores closing after failure and retains the draft', async () => {
        const pending = new Subject<AdminPlacedOrderDetailsDto>();

        service.act.mockReturnValue(pending);

        const dialog = dialogs.open(OrderActionDialog, {
            data: {
                action: 'cancel',
                order: placedOrder(),
            },
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
        TestBed.tick();
        dialog.componentInstance.model.set({ reason: 'Согласовано с покупателем' });
        TestBed.tick();
        dialog.componentInstance.submit(new Event('submit'));
        dialog.componentInstance.submit(new Event('submit'));
        dialog.componentInstance.close();
        expect(service.act).toHaveBeenCalledTimes(1);
        expect(dialog.disableClose).toBe(true);
        expect(dialogs.openDialogs).toHaveLength(1);
        pending.error(new Error('conflict'));
        TestBed.tick();
        expect(dialog.disableClose).toBe(false);
        expect(dialog.componentInstance.model().reason).toBe('Согласовано с покупателем');
        expect(TestBed.inject(OverlayContainer).getContainerElement().textContent).toContain(
            'Статус заказа мог измениться',
        );
    });

    it('rejects whitespace and refuses to submit once closing starts', async () => {
        service.act.mockReturnValue(throwError(() => new Error('offline')));

        const dialog = dialogs.open(OrderActionDialog, {
            data: {
                action: 'refund',
                order: placedOrder(),
            },
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
        dialog.componentInstance.model.set({ reason: '   ' });
        TestBed.tick();
        dialog.componentInstance.submit(new Event('submit'));
        expect(service.act).not.toHaveBeenCalled();
        dialog.componentInstance.model.set({ reason: 'Причина' });
        TestBed.tick();
        dialog.close();
        dialog.componentInstance.submit(new Event('submit'));
        expect(service.act).not.toHaveBeenCalled();
    });
});
