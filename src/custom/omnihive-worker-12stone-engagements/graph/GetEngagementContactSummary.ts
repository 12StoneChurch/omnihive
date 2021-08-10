import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import type { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import type { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import Joi from "joi";
import type { Knex } from "knex";
import { serializeError } from "serialize-error";

interface Args {
    contactId: number;
}

const argsSchema = Joi.object({
    contactId: Joi.number().min(0).required(),
});

export default class GetEngagementContactSummary extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: Args, _omniHiveContext: GraphContext): Promise<ContactSummaryResult> => {
        try {
            /* Validate and clean custom arguments */
            const { value, error } = argsSchema.validate(customArgs);

            if (error) {
                throw new Error(`Invalid customArgs: ${error.message}`);
            } else {
                customArgs = value;
            }

            /* init graph connection */
            const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

            if (webRootUrl == null) {
                throw new Error("Web Root URL is undefined");
            }

            await GraphService.getSingleton().init(this.registeredWorkers, this.environmentVariables);
            GraphService.getSingleton().graphRootUrl = `${webRootUrl}/server1/custom/graphql`;

            /* get database connection */
            const worker = this.getWorker<IDatabaseWorker>(HiveWorkerType.Database, "dbMinistryPlatform");
            const connection = worker?.connection as Knex;

            /* get contact summary */
            const selectQuery = selectBuilder(connection, customArgs);
            const res = (await worker?.executeQuery(selectQuery.toString())) as ContactSummaryDTO[][];

            const dto = res && res[0][0];

            const summary: ContactSummaryResult = {
                id: dto.contact_id,
                firstName: dto.first_name,
                lastName: dto.last_name,
                phone:
                    dto.mobile_phone || dto.home_phone
                        ? {
                              mobile: dto.mobile_phone ?? undefined,
                              home: dto.home_phone ?? undefined,
                          }
                        : undefined,
                email: dto.email_address,
                dateOfBirth: dto.date_of_birth ?? undefined,
                gender: dto.gender_id ? { id: dto.gender_id, name: dto.gender_name } : undefined,
                status: dto.participant_type_id
                    ? {
                          id: dto.participant_type_id,
                          name: dto.participant_type_name,
                      }
                    : undefined,
                campus: {
                    id: dto.campus_id,
                    name: dto.campus_name,
                },
                engagements: dto.engagement_total,
                alerts: dto.alert_total,
            };

            return summary;
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

interface ContactSummaryResult {
    id: number;
    firstName: string;
    lastName: string;
    phone?: {
        mobile?: string;
        home?: string;
    };
    email: string;
    dateOfBirth?: string;
    gender?: {
        id: number;
        name: string;
    };
    status?: {
        id: number;
        name: string;
    };
    campus: {
        id: number;
        name: string;
    };
    engagements: number;
    alerts: number;
}

interface ContactSummaryDTO {
    contact_id: number;
    first_name: string;
    last_name: string;
    mobile_phone: string;
    home_phone: string;
    email_address: string;
    date_of_birth: string;
    gender_id: number;
    gender_name: string;
    campus_id: number;
    campus_name: string;
    participant_id: number;
    participant_type_id: number;
    participant_type_name: string;
    engagement_total: number;
    alert_total: number;
}

const selectBuilder = (connection: Knex, args: Args) => {
    const builder = connection.queryBuilder();

    builder
        .select(
            "c.contact_id as contact_id",
            "c.first_name as first_name",
            "c.last_name as last_name",
            "c.mobile_phone as mobile_phone",
            "h.home_phone as home_phone",
            "c.email_address as email_address",
            "c.date_of_birth as date_of_birth",
            "c.gender_id as gender_id",
            "g.gender as gender_name",
            "h.congregation_id as campus_id",
            "cong.congregation_name as campus_name",
            "c.participant_record as participant_id",
            "p.participant_type_id as participant_type_id",
            "pt.participant_type as participant_type_name",
            connection.raw("isnull(e.total, 0) as engagement_total"),
            connection.raw("isnull(cl.total, 0) as alert_total")
        )
        .from({ c: "contacts" })
        .leftJoin({ h: "households" }, { "c.household_id": "h.household_id" })
        .leftJoin({ g: "genders" }, { "c.gender_id": "g.gender_id" })
        .leftJoin({ cong: "congregations" }, { "h.congregation_id": "cong.congregation_id" })
        .leftJoin({ p: "participants" }, { "c.participant_record": "p.participant_id" })
        .leftJoin({ pt: "participant_types" }, { "p.participant_type_id": "pt.participant_type_id" })
        .leftJoin(
            connection
                .select(connection.raw("count(engagement_id) as total"), "contact_id")
                .from("engagements")
                .groupBy("contact_id")
                .as("e"),
            { "c.contact_id": "e.contact_id" }
        )
        .leftJoin(
            connection
                .select(connection.raw("count(contact_log_id) as total"), "contact_id")
                .from("contact_log")
                .where({ archived: 0, contact_log_type_id: 7 })
                .groupBy("contact_id")
                .as("cl"),
            { "c.contact_id": "cl.contact_id" }
        )
        .where({ "c.contact_id": args.contactId });

    return builder;
};
