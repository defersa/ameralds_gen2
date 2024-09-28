import { NgModule } from '@angular/core';
import { StoreComponent } from './store.component';
import { RouterModule, Routes } from '@angular/router';
import { JewelryComponent } from './pages/jewelry/jewelry.component';
import { AMSTORE_SECTION_CONFIG } from "@am/shared/menu/menu.component";
import { shopConfig } from "@am/root/layouts/store/section.config";


export const routes: Routes = [{
    path: '',
    component: StoreComponent,
    children: [
        {
            path: '',
            redirectTo: 'patterns',
            pathMatch: "full",
        },
        {
            path: 'patterns',
            loadChildren: () => import('./modules/pattern/patterns.module').then(m => m.PatternsStoreModule)
        },
        {
            path: 'jewelrys',
            component: JewelryComponent,
        },
    ]
}];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
    ],
    providers: [
        { provide: AMSTORE_SECTION_CONFIG, useValue: shopConfig},
    ]
})
export class StoreModule { }
