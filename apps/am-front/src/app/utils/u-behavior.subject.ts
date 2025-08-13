import { BehaviorSubject } from "rxjs";


export class UBehaviorSubject<T> extends BehaviorSubject<T> {
  public override next(value: T): void {
        if (value !== this.getValue()) {
            super.next(value);
        }
    }
}

