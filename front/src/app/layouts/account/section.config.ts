import { SectionsConfig } from "@am/shared/menu/menu.component";


export const accountConfig: SectionsConfig = {
    menu: {
        color: 'accent',
        label: 'ЛИЧНЫЙ КАБИНЕТ',
        list: [
            {
                label: 'Профиль',
                path: ['/', 'account', 'profile'],
                icon: 'profile',
            },
            {
                label: 'Корзина',
                path: ['/', 'account', 'goods'],
                icon: 'card',
            },
            {
                label: 'Заказы',
                path: ['/', 'account', 'orders'],
                icon: 'order',
            },
            {
                label: 'Схемы',
                path: ['/', 'account', 'patterns'],
                icon: 'pattern',
            },
        ]
    }
}
