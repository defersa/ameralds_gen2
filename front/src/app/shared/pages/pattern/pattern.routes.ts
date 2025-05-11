import { Routes } from "@angular/router";
import { PatternCardComponent } from "./card/pattern-card.component";
import { PatternEditComponent } from "./edit/pattern-edit.component";


export const PatternRoutes: Routes = [
    {
        path: 'create',
        component: PatternEditComponent,
    },
    {
        path: ':id',
        component: PatternCardComponent
    },
    {
        path: ':id/edit',
        component: PatternEditComponent,
    },
];
