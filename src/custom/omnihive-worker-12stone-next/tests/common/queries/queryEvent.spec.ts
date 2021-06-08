import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { expect } from "chai";
import sinon from "sinon";

import { queryEvent } from "../../../common/queries/queryEvent";
import { SelectEventResult, selectEvent } from "../../../common/sql/selectEvent";
import { fakeSelectEventResult } from "../../fakes";

afterEach(() => {
    sinon.restore();
});

describe("queryEvent function", () => {
    after(() => {
        sinon.restore();
    });

    it("executes a custom sql query", async () => {
        const fakeSqlQueryResult: SelectEventResult = fakeSelectEventResult;

        const fakeRunCustomSql = sinon.fake.resolves(fakeSqlQueryResult);

        sinon.stub(GraphService, "getSingleton").callsFake(() => ({
            graphRootUrl: "",
            init: async () => {},
            runQuery: async () => {},
            runCustomSql: fakeRunCustomSql,
        }));

        const [expectedResult] = fakeSqlQueryResult;

        const result = await queryEvent(fakeSqlQueryResult[0].id);

        expect(fakeRunCustomSql.calledOnce).to.be.true;
        expect(fakeRunCustomSql.getCall(0).args[0]).to.equal(selectEvent(fakeSqlQueryResult[0].id));
        expect(result).to.deep.equal(expectedResult);
    });
});
