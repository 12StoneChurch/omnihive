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
    query?: string;
    page: number;
    perPage: number;
}

const argsSchema = Joi.object({
    query: Joi.string().allow("").lowercase().optional(),
    page: Joi.number().min(1).default(1),
    perPage: Joi.number().min(1).default(10),
});

export default class SearchEngagementOwners extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (
        customArgs: Args = { page: 1, perPage: 10 },
        _omniHiveContext: GraphContext
    ): Promise<PageModel<EngagementOwnersSearchResult>> => {
        try {
            /* Verify auth token */
            await verifyToken(_omniHiveContext);

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

            const selectTotalQuery = selectBaseBuilder(connection, customArgs).toString();
            const [[totalData]] = (await worker?.executeQuery(selectTotalQuery)) as { total: number }[][];

            const totalContacts = totalData.total;

            const selectQuery = selectBuilder(connection, customArgs).toString();
            const [data] = (await worker?.executeQuery(selectQuery)) as EngagementOwnersSearchDTO[][];

            const contacts: EngagementOwnersSearchResult[] = await Promise.all(
                data.map(async (dto) => {
                    let role: string;

                    switch (dto.role) {
                        case 3:
                            role = "Admin";
                            break;
                        case 2:
                            role = "Leader";
                            break;
                        case 1:
                            role = "User";
                            break;
                        default:
                            throw new Error("User does not have sufficient permissions.");
                    }

                    let photoUrl: string | undefined = undefined;

                    if (dto.photo_guid) {
                        const {
                            GetCdnUrl: { url },
                        } = await GraphService.getSingleton().runQuery(
                            `query{GetCdnUrl(customArgs:{UniqueName:"${dto.photo_guid}"})}`
                        );

                        photoUrl = url;
                    }

                    return {
                        id: dto.contact_id,
                        firstName: dto.first_name,
                        lastName: dto.last_name,
                        campus: {
                            id: dto.campus_id,
                            name: dto.campus_name,
                        },
                        photoUrl,
                        role,
                    };
                })
            );

            return paginateItems<EngagementOwnersSearchResult>(
                contacts,
                totalContacts,
                customArgs.page,
                customArgs.perPage
            );
        } catch (err) {
            console.log(JSON.stringify(serializeError(err)));
            return err;
        }
    };
}

interface EngagementOwnersSearchResult {
    id: number;
    firstName: string;
    lastName: string;
    campus: {
        id: number;
        name: string;
    };
    photoUrl?: string;
    role: string;
}

interface EngagementOwnersSearchDTO {
    contact_id: number;
    first_name: string;
    last_name: string;
    campus_id: number;
    campus_name: string;
    photo_guid: string | null;
    role: number;
}

const selectBaseBuilder = (connection: Knex, args: Args) => {
    const builder = connection.queryBuilder();

    builder
        .distinct(connection.raw("count(distinct c.contact_id) as total"))
        .from({ r: "dp_roles" })
        .innerJoin("dp_user_roles as ur", { "r.role_id": "ur.role_id" })
        .leftJoin("contacts as c", { "ur.user_id": "c.user_account" })
        .leftJoin("households as h", { "c.household_id": "h.household_id" })
        .leftJoin("congregations as cong", { "h.congregation_id": "cong.congregation_id" })
        .leftJoin("dp_files as f", { "c.contact_id": "f.record_id", "f.page_id": 292, "f.default_image": 1 })
        .whereIn("r.role_name", ["Engagements - User", "Engagements - Team Leader", "Engagements - Administrator"])
        .modify(function () {
            /* If query provided, filter on search terms */
            if (args.query) {
                this.and.where((q) =>
                    q
                        .where("c.first_name", "like", `%${args.query}`)
                        .or.where("c.last_name", "like", `%${args.query}`)
                        .or.where("c.nickname", "like", `%${args.query}%`)
                        .or.where("c.display_name", "like", `%${args.query}%`)
                        .or.where("c.email_address", "like", `%${args.query}%`)
                        .or.where("c.mobile_phone", "like", `%${args.query}%`)
                        .or.where(connection.raw("c.first_name + ' ' + c.last_name"), "like", `%${args.query}%`)
                        .or.where(connection.raw("c.nickname + ' ' + c.last_name"), "like", `%${args.query}%`)
                );
            }
        });
    return builder;
};

const selectBuilder = (connection: Knex, args: Args) => {
    const builder = selectBaseBuilder(connection, args);

    builder
        .clearSelect()
        .distinct(
            "c.contact_id as contact_id",
            "c.nickname as first_name",
            "c.last_name as last_name",
            "h.congregation_id as campus_id",
            "cong.congregation_name as campus_name",
            "f.unique_name as photo_guid",
            connection.raw(`max(case when r.role_name = 'Engagements - Administrator' then 3
                                     when r.role_name = 'Engagements - Team Leader' then 2
                                     when r.role_name = 'Engagements - User' then 1
                                     else 0 end) as role`)
        )
        .groupBy(
            "c.contact_id",
            "c.nickname",
            "c.last_name",
            "h.congregation_id",
            "cong.congregation_name",
            "f.unique_name"
        )
        .orderBy("c.last_name")
        .limit(args.perPage)
        .offset((args.page - 1) * args.perPage);

    return builder;
};
