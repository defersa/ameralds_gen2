import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AmstorePaginatorComponent } from './paginator.component';
import { AmstoreIconModule } from '../icons/icons.module';



@NgModule({
    declarations: [AmstorePaginatorComponent],
    exports: [AmstorePaginatorComponent],
    imports: [
        CommonModule,
        AmstoreIconModule
    ]
})
export class AmstorePaginatorModule { }
