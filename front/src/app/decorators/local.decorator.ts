export function LocalStorage(name?: string): (target: Object, propertyKey: string) => void {
    return function (target: Object, propertyKey: string) {
        const localName: string = name || propertyKey;

        const getter: () => void = () => {
            return window.localStorage.getItem(localName) ?? '';
        };

        const setter: (value: string) => void = (value: string) => {
            if(!value) {
                window.localStorage.removeItem(localName);
                return;
            }

            window.localStorage.setItem(localName, value);
        };

        Object.defineProperty(target, propertyKey, {
            get: getter,
            set: setter
        });
    }
}
