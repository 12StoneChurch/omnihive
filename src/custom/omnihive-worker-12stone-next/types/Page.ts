export type Page<T> = {
    page: number;
    previousPage?: number;
    nextPage?: number;
    items: T[];
};
