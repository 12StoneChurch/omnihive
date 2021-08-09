import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import type { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import type { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import Joi from "joi";
import type { Knex } from "knex";
import { serializeError } from "serialize-error";

import type { ContactModel } from "../lib/models/ContactModel";

interface Args {
    contactId: number;
}

const argsSchema = Joi.object({
    contactId: Joi.number().required(),
});

export default class GetContact extends HiveWorkerBase implements IGraphEndpointWorker {
    async execute(customArgs: Args, _omniHiveContext: GraphContext): Promise<ContactModel> {
        try {
            /* validate and sanitize custom arguments */
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

            /* select contact */
            const selectQuery = selectBuilder(connection, customArgs).toString();
            const res = (await worker?.executeQuery(selectQuery)) as SelectContactDTO[][];

            const dto = res && res[0][0];

            let photoUrl: string | undefined = undefined;

            if (dto.photo_guid) {
                const {
                    GetCdnUrl: { url },
                } = await GraphService.getSingleton().runQuery(`
                        	query{GetCdnUrl(customArgs:{UniqueName:"${dto.photo_guid}"})}
                        `);

                photoUrl = url;
            }

            return {
                id: dto.contact_id,
                userId: dto.user_id ?? undefined,
                participantId: dto.participant_id ?? undefined,
                firstName: dto.first_name,
                lastName: dto.last_name,
                displayName: dto.display_name,
                nickname: dto.nickname,
                email: dto.email,
                phone: dto.phone ?? undefined,
                age: dto.age ?? undefined,
                address: dto.address_line_1
                    ? {
                          line1: dto.address_line_1,
                          line2: dto.address_line_2 ?? undefined,
                          city: dto.city ?? undefined,
                          state: dto.state ?? undefined,
                          zip: dto.zip ?? undefined,
                      }
                    : undefined,
                campus: { id: dto.campus_id, name: dto.campus_name },
                household: {
                    id: dto.household_id,
                    positionId: dto.household_position_id ?? undefined,
                    position: dto.household_position ?? undefined,
                },
                photoUrl: photoUrl ?? undefined,
            };
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    }
}

interface SelectContactDTO {
    contact_id: number;
    participant_id: number | null;
    user_id: number | null;
    first_name: string;
    last_name: string;
    nickname: string;
    display_name: string;
    email: string;
    phone: string | null;
    address_line_1: string | null;
    address_line_2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    age: number | null;
    campus_id: number;
    campus_name: string;
    household_id: number;
    household_position_id: number | null;
    household_position: string | null;
    photo_guid: string | null;
}

const selectBuilder = (connection: Knex, args: Args) => {
    const builder = connection.queryBuilder();

    builder
        .select(
            "c.contact_id as contact_id",
            "c.participant_record as participant_id",
            "u.user_id as user_id",
            "c.first_name as first_name",
            "c.last_name as last_name",
            "c.nickname as nickname",
            "c.display_name as display_name",
            "c.email_address as email",
            "c.mobile_phone as phone",
            "a.address_line_1 as address_line_1",
            "a.address_line_2 as address_line_2",
            "a.city as city",
            "a.state/region as state",
            "a.postal_code as zip",
            "c.date_of_birth as date_of_birth",
            "c.__age as age",
            "h.congregation_id as campus_id",
            "cong.congregation_name as campus_name",
            "c.household_id as household_id",
            "c.household_position_id as household_position_id",
            "hp.household_position as household_position",
            "f.unique_name as photo_guid"
        )
        .from({ c: "contacts" })
        .leftJoin("dp_users as u", { "c.user_account": "u.user_id" })
        .leftJoin("households as h", { "c.household_id": "h.household_id" })
        .leftJoin("household_positions as hp", { "c.household_position_id": "hp.household_position_id" })
        .leftJoin("addresses as a", { "h.address_id": "a.address_id" })
        .leftJoin("congregations as cong", { "h.congregation_id": "cong.congregation_id" })
        .leftJoin("dp_files as f", { "c.contact_id": "f.record_id", "f.page_id": 292 })
        .where({ "c.contact_id": args.contactId })
        .andWhere({ "c.company": 0 });

    return builder;
};
