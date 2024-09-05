import { SectionsConfig } from "@am/shared/menu/menu.component";


export const shopConfig: SectionsConfig = {
    menu: {
        color: 'primary',
        label: 'МАГАЗИН',
        list: [
            {
                label: 'Схемы',
                path: ['/', 'patterns'],
                icon: 'pattern',
            },
            {
                label: 'Украшения',
                path: ['/', 'jewelrys'],
                icon: 'jewelry'
            },
        ]
    }
}
