
export interface ReCAPTCHA {

  execute(opt_widget_id?: string, option?: { action?: string}): Promise<string>;

  ready(callback: () => void): void;

}
