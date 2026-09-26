import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgxSkeletonLoaderComponent, type NgxSkeletonLoaderConfigTheme } from 'ngx-skeleton-loader';


@Component({
    selector: 'amstore-patterns-skeleton',
    templateUrl: './patterns-skeleton.component.html',
    styleUrls: ['./patterns-skeleton.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgxSkeletonLoaderComponent,
    ],
})
export class AmstorePatternsSkeletonComponent {
    public readonly skeletonItems: number[] = Array.from({ length: 3 }, (_: unknown, index: number) => index);
    public readonly skeletonChipItems: number[] = Array.from({ length: 4 }, (_: unknown, index: number) => index);
    public readonly skeletonTheme: NgxSkeletonLoaderConfigTheme = {
        display: 'grid',
        'grid-template-columns': '40% 1fr',
        height: '200px',
        'margin-bottom': '16px',
        overflow: 'hidden',
        'border-radius': '8px',
        'box-shadow': '0 0 8px rgba(46, 50, 45, .3)',
        background: '#fff',
    };
    public readonly skeletonImageTheme: NgxSkeletonLoaderConfigTheme = {
        width: '100%',
        height: '100%',
        margin: '0',
        'border-radius': '0',
        background: '#d7ddd8',
    };
    public readonly skeletonTitleTheme: NgxSkeletonLoaderConfigTheme = {
        width: '48%',
        height: '28px',
        margin: '0 0 16px',
        'border-radius': '4px',
        background: '#d7ddd8',
    };
    public readonly skeletonIconTheme: NgxSkeletonLoaderConfigTheme = {
        width: '24px',
        height: '24px',
        margin: '0',
        'border-radius': '4px',
        background: '#e1e5e1',
    };
    public readonly skeletonChipTheme: NgxSkeletonLoaderConfigTheme = {
        width: '68px',
        height: '26px',
        margin: '0',
        'border-radius': '4px',
        background: '#aeb9ae',
    };
    public readonly skeletonSmallChipTheme: NgxSkeletonLoaderConfigTheme = {
        width: '32px',
        height: '26px',
        margin: '0',
        'border-radius': '4px',
        background: '#e6e9e5',
        border: '1px solid #b9c2b8',
    };
    public readonly skeletonTextTheme: NgxSkeletonLoaderConfigTheme = {
        width: '180px',
        height: '20px',
        margin: '0',
        'border-radius': '4px',
        background: '#d7ddd8',
    };
    public readonly skeletonButtonTheme: NgxSkeletonLoaderConfigTheme = {
        width: '88px',
        height: '36px',
        margin: '12px 0 0 auto',
        'border-radius': '4px',
        background: '#8da18c',
    };
}
