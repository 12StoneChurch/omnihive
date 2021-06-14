import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { expect } from "chai";
import sinon from "sinon";

import { queryEventsList } from "../../../common/queries/queryEventsList";
import { SelectEventsListResult, selectEventsList } from "../../../common/sql/listEvents";
import { fakeSelectEventsListResult } from "../../fakes";

afterEach(() => {
    sinon.restore();
});

describe("queryEvent function", () => {
    it("executes a custom sql query", async () => {
        const fakeSqlQueryResult: SelectEventsListResult = fakeSelectEventsListResult;
        const fakeRunCustomSql = sinon.fake.resolves(fakeSqlQueryResult);
        sinon.stub(GraphService, "getSingleton").callsFake(() => ({
            graphRootUrl: "",
            init: async () => {},
            runQuery: async () => {},
            runCustomSql: fakeRunCustomSql,
        }));
        const [expectedResult] = fakeSqlQueryResult;
        const result = await queryEventsList(1, 1, 4);
        expect(fakeRunCustomSql.calledOnce).to.be.true;
        expect(fakeRunCustomSql.getCall(0).args[0]).to.equal(selectEventsList(1, 1, 4));
        expect(result).to.deep.equal(expectedResult);
    });
});
