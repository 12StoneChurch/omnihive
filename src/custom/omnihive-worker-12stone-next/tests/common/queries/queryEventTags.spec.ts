import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { expect } from "chai";
import sinon from "sinon";

import { queryEventTags } from "../../../common/queries/queryEventTags";
import { SelectEventTagResult, selectEventTags } from "../../../common/sql/selectEventTags";
import { fakeSelectEventTagsResult } from "../../fakes";

afterEach(() => {
    sinon.restore();
});

describe("queryEventTags function", () => {
    it("executes a custom sql query", async () => {
        const fakeSqlQueryResult: SelectEventTagResult = fakeSelectEventTagsResult;

        const fakeRunCustomSql = sinon.fake.resolves([fakeSqlQueryResult]);

        sinon.stub(GraphService, "getSingleton").callsFake(() => ({
            graphRootUrl: "",
            init: async () => {},
            runQuery: async () => {},
            runCustomSql: fakeRunCustomSql,
        }));

        const expectedResult = fakeSqlQueryResult;

        const result = await queryEventTags(fakeSqlQueryResult[0].id);

        console.log(result);

        expect(fakeRunCustomSql.calledOnce).to.be.true;
        expect(fakeRunCustomSql.getCall(0).args[0]).to.equal(selectEventTags(fakeSqlQueryResult[0].id));
        expect(result).to.deep.equal(expectedResult);
    });
});
