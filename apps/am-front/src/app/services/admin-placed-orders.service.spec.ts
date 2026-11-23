import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiAdminPlacedOrdersProducer } from '@am-front/root/api-v2';
import { AdminPlacedOrdersService } from './admin-placed-orders.service';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';


describe('administrative orders request access', () => {
    const authenticated = signal(true);
    const admin = signal(true);
    const api = {
        adminPlacedOrdersControllerList: jest.fn(),
        adminPlacedOrdersControllerDetails: jest.fn(),
        adminPlacedOrdersControllerCancel: jest.fn(),
        adminPlacedOrdersControllerRefund: jest.fn(),
    };

    beforeEach(() => {
        authenticated.set(true);
        admin.set(true);
        jest.clearAllMocks();
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: ApiAdminPlacedOrdersProducer,
                    useValue: api,
                },
                {
                    provide: AuthService,
                    useValue: { auth: authenticated },
                },
                {
                    provide: ProfileService,
                    useValue: { isAdmin: admin },
                },
            ],
        });
    });

    it('checks the current role at subscription time for list, details and actions', () => {
        const service = TestBed.inject(AdminPlacedOrdersService);
        const requests = [
            service.list({
                page: 1,
                pageSize: 20,
            }),
            service.details(7),
            service.act(7, 'cancel', 'Причина'),
            service.act(7, 'refund', 'Причина'),
        ];
        const error = jest.fn();

        admin.set(false);

        for (const request of requests) {
            request.subscribe({ error });
        }

        expect(error).toHaveBeenCalledTimes(4);
        expect(api.adminPlacedOrdersControllerList).not.toHaveBeenCalled();
        expect(api.adminPlacedOrdersControllerDetails).not.toHaveBeenCalled();
        expect(api.adminPlacedOrdersControllerCancel).not.toHaveBeenCalled();
        expect(api.adminPlacedOrdersControllerRefund).not.toHaveBeenCalled();
    });

    it('passes UTC calendar dates unchanged to the generated client', () => {
        api.adminPlacedOrdersControllerList.mockReturnValue(
            of({
                items: [],
            }),
        );
        TestBed.inject(AdminPlacedOrdersService)
            .list({
                page: 2,
                pageSize: 10,
                statuses: 'success,cancel',
                user: 'buyer',
                from: '2026-11-01',
                to: '2026-11-22',
            })
            .subscribe();
        expect(api.adminPlacedOrdersControllerList).toHaveBeenCalledWith(
            2,
            10,
            'success,cancel',
            'buyer',
            '2026-11-01',
            '2026-11-22',
        );
    });
});
