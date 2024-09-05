import { ValidationErrors } from "@angular/forms";
type TransformFunc = (value?: any) => string;
const ErrorTemplates: Record<string, TransformFunc> = {
    required: () => 'Это поле обязательно',
    email: () => 'Email не корректен',
    minValue: (value: { current: number; expected: number; }) => `Текущее значение ${value.current} меньше чем минимально ожидаемое ${value.expected}`,
    notUniq: (value: unknown) => `Значение должно быть отлично от существующих!`,
    auth: () => '',
    notEmail: () => 'Проверьте написание почты.',
    notEqualPassword: () => 'Пароли не совпадают!',
    notComplexity: () => 'Слишком простой пароль! Он должен содержать минимум: 8 символов, заглавные и строчные латинские символы, числа.',
    emailBusy: () => 'Данный email уже занят!'
}

export function getControlErrors(errors: ValidationErrors | null): string | null {
    if (!errors) {
        return null;
    }
    return Object.keys(errors)
        .map((key: string) => {
            const transformFunc: TransformFunc | null = ErrorTemplates[key];
            return transformFunc ? transformFunc(errors[key]) : 'Has no template for error ' + key
        })
        .join(', ');
}
