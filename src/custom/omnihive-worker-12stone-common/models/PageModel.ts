export type PageModel<T> = {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    previous_page?: number;
    next_page?: number;
    items: T[];
};
