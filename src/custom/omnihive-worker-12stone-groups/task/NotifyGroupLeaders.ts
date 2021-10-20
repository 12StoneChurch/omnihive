import { errorHelper } from "@12stonechurch/omnihive-worker-common/helpers/ErrorHelper";
import { getCustomGraphConnection } from "@12stonechurch/omnihive-worker-common/helpers/GraphHelper";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { getDatabaseObjects } from "@12stonechurch/omnihive-worker-common/helpers/GenericFunctions";

import { getAllGroupLeaders } from "../queries/getAllGroupLeaders";
import { getDashboardUrl } from "../queries/getDashboardUrl";
import { getTwilioNumber } from "../queries/getTwilioNumber";

export default class NotifyGroupLeaders extends HiveWorkerBase {
    public execute = async (): Promise<any> => {
        try {
            const { databaseWorker, knex } = getDatabaseObjects(this, "dbMinistryPlatform");
            const customGraph = await getCustomGraphConnection(this);
            const rootUrl = getDashboardUrl(this.getEnvironmentVariable("OH_WEB_ROOT_URL"));

            const from = await getTwilioNumber(knex, this.metadata.environment);
            const leaders = await getAllGroupLeaders(databaseWorker, true);

            for await (const leader of leaders) {
                if (leader.isToday && leader.isLastHour) {
                    const body = `Your group, \\\"${leader.groupName}\\\", has a scheduled meeting today. Please record your meeting attendance in the 12Stone App: ${rootUrl}/more/group-leader/${leader.groupId}/report`;
                    const to = leader.phone;

                    await customGraph.runQuery(
                        `query{SendSms(customArgs: {body: "${body}", from: "${from}", to: "${to}"})}`
                    );
                }
            }
        } catch (err) {
            return errorHelper(err);
        }
    };
}
