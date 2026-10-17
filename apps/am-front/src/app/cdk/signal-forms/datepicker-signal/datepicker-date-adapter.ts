import { Injectable } from '@angular/core';
import { MatDateFormats, NativeDateAdapter } from '@angular/material/core';


export const DATEPICKER_SIGNAL_FORMATS: MatDateFormats = {
    parse: { dateInput: null },
    display: {
        dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' },
        monthYearLabel: { month: 'short', year: 'numeric' },
        dateA11yLabel: { day: 'numeric', month: 'long', year: 'numeric' },
        monthYearA11yLabel: { month: 'long', year: 'numeric' },
    },
};

@Injectable()
export class DatepickerSignalDateAdapter extends NativeDateAdapter {
    public override parse(value: unknown): Date | null {
        if (typeof value !== 'string') {
            return super.parse(value);
        }

        const text = value.trim();

        if (!text) {
            return null;
        }

        const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);

        if (!match) {
            return this.invalid();
        }

        try {
            return this.createDate(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
        } catch {
            return this.invalid();
        }
    }
}
