import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AmstoreInputComponent } from '@am-front/cdk/forms/input/input.component';
import { AmstoreButtonComponent } from '@am-front/cdk/buttons/default/amstore-button.component';
import { AmstoreTextareaComponent } from '@am-front/cdk/forms/textarea/textarea.component';
import { NgTemplateOutlet } from '@angular/common';


@Component({
    selector: 'app-number-generator',
    templateUrl: './number-generator.component.html',
    imports: [
        AmstoreInputComponent,
        ReactiveFormsModule,
        AmstoreButtonComponent,
        AmstoreTextareaComponent,
        NgTemplateOutlet
    ],
    styleUrls: ['./number-generator.component.scss'],
    host: {
        class: 'flex flex-col gap-6',
    }
})
export class NumberGeneratorComponent {
    public countControl: FormControl = new FormControl(null, [Validators.min(3), Validators.max(1000)]);
    public takeControl: FormControl = new FormControl(null, [Validators.min(1), Validators.max(1000)]);
    public resultControl: FormControl = new FormControl('');

    public numbers: number[] = [];
    public wins: number[] = [];
    public old: number[][] = [];
    public removed: number[] = [];

    public get reverseOld(): number[][] {
        return [...this.old].reverse();
    }

    constructor() {
        this.clearAll();
    }

    public generate(): void {
        if (this.countControl.invalid) {
            this.countControl.markAllAsTouched();
            return;
        }

        this.resultControl.setValue('');
        this.clear();

        this.numbers = [...new Array(Number(this.countControl.value))].map((item: unknown, index: number) => index + 1);
    }

    public clear(): void {
        this.numbers = [];
        this.wins = [];
        this.old = [];
        this.removed = [];
    }

    public clearAll(): void {
        this.clear();

        this.countControl.setValue(10);
        this.takeControl.setValue(1);
        this.resultControl.setValue('');
    }

    public take(): void {
        if (this.takeControl.invalid) {
            this.takeControl.markAllAsTouched();
            return;
        }

        const takeValue: number = Number(this.takeControl.value);

        if (takeValue > this.numbers.length) {
            this.takeControl.setErrors({ message: 'Нельзя взять больше чем количество оставшихся' });
            return;
        }

        if (this.wins.length) {
            this.old.push(this.wins);
        }

        this.wins = [...new Array(takeValue)].map(() => {
            const position: number = Math.floor(Math.random() * this.numbers.length);
            const value: number = this.numbers[position];

            this.numbers = this.numbers.filter((item: number, index: number) => index !== position);
            return value;
        }).sort((a: number, b: number) => a - b);

        this.resultControl.setValue([...this.old, this.wins].map((array: number[], index: number) => `Раунд ${index + 1}: ${array.join(', ')}`).join('\n'));
    }

    public remove(value): void {
        this.numbers = this.numbers.filter((item: number) => item !== value);

        this.removed = [...this.removed, value].sort((a: number, b: number) => a - b);
    }
}
