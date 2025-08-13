export class MemoryStorage implements Storage {
    protected _data: { [key: string]: string | null };

    public length: number = 0;

    constructor() {
        this._data = {};
    }

    public clear(): void {
        this._data = {};
        this.length = 0;
    }

    public getItem(key: string): string | null {
        return this._data[key] !== undefined ? this._data[key] : null;
    }

    public key(index: number): string | null {
        return Object.keys(this._data).find((k: string, i: number): boolean => i === index) || null;
    }

    public removeItem(key: string): void {
        if (this._data[key] !== undefined) {
            this.length--;
            delete this._data[key];
        }
    }

    public setItem(key: string, value: string): void {
        this._data[key] = value;
        this.length = Object.keys(this._data).length;
    }

    public get(key: string): string | null {
        return this.getItem(key);
    }

    public set(key: string, value: string): void {
        this.setItem(key, value);
    }

    public remove(key: string): void {
        this.removeItem(key);
    }
}
