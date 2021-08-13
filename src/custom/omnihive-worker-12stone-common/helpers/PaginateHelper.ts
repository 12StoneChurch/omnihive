import { PageModel } from "../models/PageModel";

export const paginateItems = <T>(items: T[], total_items: number, page: number, per_page: number): PageModel<T> => {
    const total_pages = Math.ceil(total_items / per_page);

    const next_page = (function () {
        if (page + 1 <= total_pages) return page + 1;
        return undefined;
    })();

    const previous_page = (function () {
        if (page > total_pages) return total_pages;
        if (page - 1 > 0) return page - 1;
        return undefined;
    })();

    return {
        page,
        per_page,
        total_items,
        total_pages,
        next_page,
        previous_page,
        items,
    };
};
