import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { expect } from "chai";
import sinon from "sinon";

import { mapEvent, queryEvent, queryEventTags } from "../../common/queries/getEventById";
import { SelectEventResult, selectEvent } from "../../common/sql/selectEvent";
import { SelectEventTagResult, selectEventTags } from "../../common/sql/selectEventTags";
import { EventType } from "../../types/Event";
import { fakeEvent, fakeSelectEventResult, fakeSelectEventTagsResult } from "../fakes";

afterEach(() => {
    sinon.restore();
});

describe("getEventById query module", () => {
    describe("queryEventTags function", () => {
        it("executes a custom sql query", async () => {
            const fakeSqlQueryResult: SelectEventTagResult = fakeSelectEventTagsResult;

            const fakeRunCustomSql = sinon.fake.resolves(fakeSqlQueryResult);

            sinon.stub(GraphService, "getSingleton").callsFake(() => ({
                graphRootUrl: "",
                init: async () => {},
                runQuery: async () => {},
                runCustomSql: fakeRunCustomSql,
            }));

            const [expectedResult] = fakeSqlQueryResult;

            const result = await queryEventTags(fakeSqlQueryResult[0].id);

            expect(fakeRunCustomSql.calledOnce).to.be.true;
            expect(fakeRunCustomSql.getCall(0).args[0]).to.equal(selectEventTags(fakeSqlQueryResult[0].id));
            expect(result).to.deep.equal(expectedResult);
        });
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

    describe("mapEvent function", () => {
        it("maps query results to events objects", () => {
            const fakeTagResults: SelectEventTagResult = fakeSelectEventTagsResult;
            const fakeEventResults: SelectEventResult = fakeSelectEventResult;

            const [result]: EventType[] = mapEvent(fakeTagResults, fakeEventResults);

            expect(result).to.deep.equal(fakeEvent);
        });
    });
});
