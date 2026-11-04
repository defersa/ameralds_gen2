import { INT32_MAX, MIN_POSITIVE_INTEGER } from "./numeric-limits";


export const FIRST_PAGE = MIN_POSITIVE_INTEGER;
export const DEFAULT_PAGE_SIZE = 10;

/** Принятый предел номера страницы в API; сам номер страницы в БД не хранится. */
export const MAX_PAGE_NUMBER = INT32_MAX;
