import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from "@angular/router";

import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';

import { AmstoreCdkModule } from '@am/cdk/cdk.module';

import { ProfileComponent } from './profile.component';
import { AmstoreLoginComponent } from './login/login.component';


@NgModule({
    declarations: [ProfileComponent, AmstoreLoginComponent],
    exports: [ProfileComponent],
    imports: [
        CommonModule,
        AmstoreCdkModule,

        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        RouterModule
    ]
})
export class AmstoreProfileModule { }
