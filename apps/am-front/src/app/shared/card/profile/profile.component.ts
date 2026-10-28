import { ChangeDetectionStrategy, Component, effect, input, signal, ViewEncapsulation } from '@angular/core';
import { form, FormField, readonly } from '@angular/forms/signals';
import { UserProfileDto } from '@am-front/root/api-v2';
import { AmstorePanelExpandComponent, AmstorePanelHeaderComponent } from '@am-front/cdk/panel/panel-expand/panel-expand.component';
import { AmstoreInputSignalComponent } from '@am-front/cdk/signal-forms';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';

@Component({
    selector: 'amstore-profile-card',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [
        AmstorePanelExpandComponent,
        AmstorePanelHeaderComponent,
        AmstoreInputSignalComponent,
        FormField,
        AmstoreButtonComponent,
    ],
    host: { class: 'amstore-profile-card block w-full' },
})
export class AmstoreProfileCardComponent {
    public readonly user = input.required<UserProfileDto>();

    private readonly profileValues = signal({ username: '', email: '' });

    protected readonly profileForm = form(this.profileValues, (path) => {
        readonly(path.username);
        readonly(path.email);
    });

    constructor() {
        effect(() => {
            const { username, email } = this.user();
            this.profileValues.set({ username, email });
        });
    }
}
