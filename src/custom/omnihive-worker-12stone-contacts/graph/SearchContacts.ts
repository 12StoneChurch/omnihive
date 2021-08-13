import { paginateItems } from "@12stonechurch/omnihive-worker-common/helpers/PaginateHelper";
import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import { PageModel } from "@12stonechurch/omnihive-worker-common/models/PageModel";
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
    query: string;
    requireUserId: boolean;
    page: number;
    perPage: number;
}

const argsSchema = Joi.object({
    query: Joi.string().required(),
    requireUserId: Joi.bool().default(false),
    page: Joi.number().min(1).default(1),
    perPage: Joi.number().min(1).default(10),
});

export default class SearchContacts extends HiveWorkerBase implements IGraphEndpointWorker {
    async execute(customArgs: Args, _omniHiveContext: GraphContext): Promise<PageModel<ContactSearchResult>> {
        try {
            /* Verify auth token */
            await verifyToken(_omniHiveContext);

            /* validate and clean custom arguments */
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

            /* search contacts */

            const selectTotalQuery = selectBaseBuilder(connection, customArgs).toString();
            const [[totalData]] = (await worker?.executeQuery(selectTotalQuery)) as { total: number }[][];

            const totalContacts = totalData.total;

            const selectQuery = selectBuilder(connection, customArgs).toString();
            const [data] = (await worker?.executeQuery(selectQuery)) as ContactSearchDTO[][];

            const contacts: ContactSearchResult[] = await Promise.all(
                data.map(async (dto) => {
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
                        firstName: dto.first_name ?? undefined,
                        lastName: dto.last_name ?? undefined,
                        email: dto.email_address,
                        phone: dto.mobile_phone ?? undefined,
                        photoUrl: photoUrl ?? undefined,
                    };
                })
            );

            return paginateItems<ContactSearchResult>(contacts, totalContacts, customArgs.page, customArgs.perPage);
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    }
}

interface ContactSearchResult {
    id: number;
    userId?: number;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    photoUrl?: string;
}

interface ContactSearchDTO {
    contact_id: number;
    user_id: number | null;
    first_name: string | null;
    last_name: string | null;
    email_address: string;
    mobile_phone: string | null;
    photo_guid: string | null;
}

const selectBaseBuilder = (connection: Knex, args: Args) => {
    const builder = connection.queryBuilder();

    builder
        .select(connection.raw("count(c.Contact_ID) as total"))
        .from({ c: "Contacts" })
        .leftJoin("dp_Users as u", { "c.User_Account": "u.User_ID" })
        .leftJoin("dp_Files as f", { "c.Contact_ID": "f.Record_ID", "f.Page_ID": 292, "f.default_image": 1 })
        .where({ "c.Company": 0 })
        .and.where(function () {
            this.where("c.First_Name", "like", `%${args.query}%`)
                .or.where("c.Last_Name", "like", `%${args.query}%`)
                .or.where("c.Nickname", "like", `%${args.query}%`)
                .or.where("c.Display_Name", "like", `%${args.query}%`)
                .or.where("c.Email_Address", "like", `%${args.query}%`)
                .or.where("c.Mobile_Phone", "like", `%${args.query}%`)
                .or.where(connection.raw("c.First_Name + ' ' + c.Last_Name"), "like", `%${args.query}%`)
                .or.where(connection.raw("c.Nickname + ' ' + c.Last_Name"), "like", `%${args.query}%`);
        })
        .modify(function () {
            if (args.requireUserId) {
                this.whereNotNull("u.User_ID");
            }
        });

    return builder;
};

const selectBuilder = (connection: Knex, args: Args) => {
    const builder = selectBaseBuilder(connection, args);

    builder
        .clearSelect()
        .select(
            "c.Contact_ID as contact_id",
            "u.User_ID as user_id",
            "c.First_Name as first_name",
            "c.Last_Name as last_name",
            "c.Email_Address as email_address",
            "c.Mobile_Phone as mobile_phone",
            "f.Unique_Name as photo_guid"
        )
        .orderBy("c.Last_Name")
        .limit(args.perPage)
        .offset((args.page - 1) * args.perPage);

    return builder;
};
