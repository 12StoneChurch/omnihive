import { expect } from "chai";
import sinon from "sinon";

import { mapEvent } from "../../../common/helpers/mapEvent";
import { SelectEventResult } from "../../../common/sql/selectEvent";
import { SelectEventTagResult } from "../../../common/sql/selectEventTags";
import { EventType } from "../../../types/Event";
import { fakeEvent, fakeSelectEventResult, fakeSelectEventTagsResult } from "../../fakes";

afterEach(() => {
    sinon.restore();
});

describe("mapEvent function", () => {
    it("maps query results to events objects", () => {
        const fakeTagResults: SelectEventTagResult = fakeSelectEventTagsResult;
        const fakeEventResults: SelectEventResult = fakeSelectEventResult;

        const [result]: EventType[] = mapEvent(fakeTagResults, fakeEventResults);

        expect(result).to.deep.equal(fakeEvent);
    });
});
