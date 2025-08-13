import { MemoryStorage } from './memory-storage';


let storage: Storage = window.localStorage;
try {
    storage.length;
} catch (error: unknown) {
    console.error(error);
    try {
        sessionStorage.length;
        storage = window.sessionStorage;
    } catch (error: unknown) {
        console.error(error);
        storage = new MemoryStorage();
    }
}

export function LocalStorage(key?: string) {
    // eslint-disable-next-line @typescript-eslint/ban-types
    return (target: Object, propName: string) => {
        const factKey: string = key || propName;

        function getValue(): string {
            return storage.getItem(factKey);
        }

        function setValue(val: unknown): void {
            // TODO is it works well for '' | 0 values?
            if (val) {
                storage.setItem(factKey, typeof val === 'string' ? val : JSON.stringify(val));
            } else {
                storage.removeItem(factKey);
            }
        }

        Object.defineProperty(target, propName, {
            configurable: true,
            enumerable: true,
            get: getValue,
            set: setValue,
        });
    };
}
