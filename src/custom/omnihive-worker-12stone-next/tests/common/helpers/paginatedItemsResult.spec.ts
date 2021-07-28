import { expect } from "chai";

import { paginatedItemsResult } from "../../../common/helpers/paginatedItemsResult";
import type { EventType } from "../../../types/Event";
import { PageType } from "../../../types/Page";
import { fakeEvent } from "../../fakes";

describe("paginatedItemsResult function", () => {
    it("transforms a paginated array into a page object", () => {
        const fakeEventItems = [fakeEvent];
        const expectedResult: PageType<EventType> = {
            page: 1,
            total_items: 10,
            total_pages: 10,
            per_page: 1,
            next_page: 2,
            previous_page: undefined,
            items: fakeEventItems,
        };

        const result = paginatedItemsResult<EventType>(fakeEventItems, 1, 10, 1);
        expect(result).to.deep.equal(expectedResult);
    });
});
