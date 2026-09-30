import { ValidationErrors } from "@angular/forms";
import type { ValidationError } from "@angular/forms/signals";


type TransformFunc = (value?: any) => string;
const ErrorTemplates: Record<string, TransformFunc> = {
    required: () => 'Это поле обязательно',
    email: () => 'Email не корректен',
    vkUrl: () => 'Ссылка должна начинаться с https://vk.ru/',
    contactRequired: () => 'Заполните хотя бы одно из полей',
    minValue: (value: { current: number; expected: number; }) => `Текущее значение ${value.current} меньше чем минимально ожидаемое ${value.expected}`,
    notUniq: (value: unknown) => `Значение должно быть отлично от существующих!`,
    auth: () => '',
    notEmail: () => 'Проверьте написание почты.',
    notEqualPassword: () => 'Пароли не совпадают!',
    notComplexity: () => 'Слишком простой пароль! Он должен содержать минимум: 8 символов, заглавные и строчные латинские символы, числа.',
    emailBusy: () => 'Данный email уже занят!'
}

export type FormErrors = ValidationErrors | readonly ValidationError.WithOptionalFieldTree[];

export function getControlErrors(errors: FormErrors | null): string | null {
    if (!errors) {
        return null;
    }

    const preparedErrors: ValidationErrors = Array.isArray(errors)
        ? errors.reduce((result: ValidationErrors, error: ValidationError.WithOptionalFieldTree) => {
            result[error.kind] = error;

            return result;
        }, {})
        : errors;

    return Object.keys(preparedErrors)
        .map((key: string) => {
            const transformFunc: TransformFunc | null = ErrorTemplates[key];

            if (key === 'message') {
                return preparedErrors[key];
            }

            return transformFunc ? transformFunc(preparedErrors[key]) : 'Has no template for error ' + key
        })
        .join(', ');
}
