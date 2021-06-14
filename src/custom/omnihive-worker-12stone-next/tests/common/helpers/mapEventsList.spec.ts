import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { expect } from "chai";
import sinon from "sinon";

import { mapEventsList } from "../../../common/helpers/mapEventsList";
import { SelectEventsListResult } from "../../../common/sql/listEvents";
import { SelectEventTagResult } from "../../../common/sql/selectEventTags";
import { fakeEvent, fakeSelectEventTagsResult, fakeSelectEventsListResult } from "../../fakes";

afterEach(() => {
    sinon.restore();
});

describe("mapEventsList function", () => {
    it("maps an array of event query results to events objects", async () => {
        const fakeSqlQueryResult: SelectEventTagResult = fakeSelectEventTagsResult;
        const fakeRunCustomSql = sinon.fake.resolves([fakeSqlQueryResult]);

        sinon.stub(GraphService, "getSingleton").callsFake(() => ({
            graphRootUrl: "",
            init: async () => {},
            runQuery: async () => {},
            runCustomSql: fakeRunCustomSql,
        }));

        const fakeEventListResults: SelectEventsListResult = fakeSelectEventsListResult;

        const [result] = await mapEventsList(fakeEventListResults);

        expect(result).to.deep.equal(fakeEvent);
    });
});
