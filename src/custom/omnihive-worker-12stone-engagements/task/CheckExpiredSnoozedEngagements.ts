import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { ITaskEndpointWorker } from "@withonevision/omnihive-core/interfaces/ITaskEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import dayjs from "dayjs";
import { Knex } from "knex";
import { serializeError } from "serialize-error";

import { getPhoneByContactId } from "../queries/getPhoneByContactId";
import { getTwilioNumber } from "../queries/getTwilioNumber";
import { insertEngagementLogQuery } from "../queries/insertEngagementLog";
import { sendText } from "../queries/sendText";

export default class CheckExpiredSnoozedEngagements extends HiveWorkerBase implements ITaskEndpointWorker {
    public execute = async (): Promise<any> => {
        try {
            const worker = this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");
            const connection = worker?.connection as Knex;
            const graphUrl = this.getEnvironmentVariable("OH_WEB_ROOT_URL") + this.metadata.customUrl;

            /* get all snoozed engagements */
            const selectSnoozedEngagementsQuery = selectSnoozedEngagements(connection);
            const selectSnoozedEngagementsRes = (await worker?.executeQuery(
                selectSnoozedEngagementsQuery.toString()
            )) as SnoozedEngagementsDto[][];
            const snoozedEngagements = selectSnoozedEngagementsRes && selectSnoozedEngagementsRes[0];

            /* get only expires snoozed engagements */
            const expiredSnoozedEngagements = snoozedEngagements.filter((dto) =>
                dayjs(dto.snoozed_until).isBefore(dayjs())
            );

            console.log(expiredSnoozedEngagements);

            /* set expires snoozed engagements to open and delete exiration date */
            const updateSnoozedEngagementsQuery = updateSnoozedEngagements(
                connection,
                expiredSnoozedEngagements.map((dto) => dto.engagement_id)
            );
            await worker?.executeQuery(updateSnoozedEngagementsQuery.toString());

            for (const dto of expiredSnoozedEngagements) {
                /* create engagement log */
                const logArgs = {
                    engagementId: dto.engagement_id,
                    description: `Status changed to Open`,
                    typeId: 3,
                };

                await worker?.executeQuery(insertEngagementLogQuery(connection, logArgs).toString());

                /* message owner */
                try {
                    console.log({ contactId: dto.owner_contact_id });
                    const ownerPhone = (await getPhoneByContactId(connection, dto.owner_contact_id))[0].Mobile_Phone;
                    console.log({ ownerPhone });
                    const twilioNumber = (await getTwilioNumber(connection, this.metadata.environment))[0]
                        .Default_Number;
                    console.log({ twilioNumber });

                    if (ownerPhone && twilioNumber) {
                        const textData = {
                            body: `A snoozed \\\"${dto.type}\\\" engagement for ${dto.first_name} ${dto.last_name} has been re-opened`,
                            from: twilioNumber,
                            to: ownerPhone,
                        };
                        console.log({ graphUrl });
                        await sendText(textData, graphUrl);
                    }
                } catch (err) {
                    console.error(err);
                    console.log(JSON.stringify(serializeError(err)));
                }
            }
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            throw err;
        }
    };
}

interface SnoozedEngagementsDto {
    engagement_id: number;
    owner_contact_id: number;
    snoozed_until: Date;
    type: string;
    first_name: string;
    last_name: string;
}

const selectSnoozedEngagements = (connection: Knex) => {
    const builder = connection.queryBuilder();

    builder
        .select(
            "e.engagement_id as engagement_id",
            "e.owner_contact_id as owner_contact_id",
            "e.snoozed_until as snoozed_until",
            "et.name as type",
            "c.nickname as first_name",
            "c.last_name as last_name"
        )
        .from({ e: "engagements" })
        .leftJoin({ et: "engagement_types" }, { "e.engagement_type_id": "et.engagement_type_id" })
        .leftJoin({ es: "engagement_statuses" }, { "e.engagement_status_id": "es.engagement_status_id" })
        .leftJoin({ c: "contacts" }, { "e.contact_id": "c.contact_id" })
        .where({ "e.engagement_status_id": 3 });

    return builder;
};

const updateSnoozedEngagements = (connection: Knex, engagementIds: number[]) => {
    const builder = connection.queryBuilder();

    builder
        .from("engagements")
        .update({ engagement_status_id: 2, snoozed_until: null })
        .whereIn("engagement_id", engagementIds);

    return builder;
};
