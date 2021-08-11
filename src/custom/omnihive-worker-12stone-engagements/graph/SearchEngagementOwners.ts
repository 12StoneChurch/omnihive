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
    page: number;
    perPage: number;
}

const argsSchema = Joi.object({
    page: Joi.number().min(1).default(1),
    perPage: Joi.number().min(1).default(10),
});

export default class SearchEngagementOwners extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (
        customArgs: Args,
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

            const selectTotalQuery = selectBaseBuilder(connection).toString();
            const [[totalData]] = (await worker?.executeQuery(selectTotalQuery)) as { total: number }[][];

            const totalContacts = totalData.total;

            const selectQuery = selectBuilder(connection, customArgs).toString();
            const [data] = (await worker?.executeQuery(selectQuery)) as EngagementOwnersSearchDTO[][];

            const contacts: EngagementOwnersSearchResult[] = data.map((dto) => ({
                id: dto.contact_id,
                firstName: dto.first_name,
                lastName: dto.last_name,
            }));

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
}

interface EngagementOwnersSearchDTO {
    contact_id: number;
    first_name: string;
    last_name: string;
}

const selectBaseBuilder = (connection: Knex) => {
    const builder = connection.queryBuilder();

    builder
        .select(connection.raw("count(c.contact_id) as total"))
        .from({ r: "dp_roles" })
        .innerJoin("dp_user_roles as ur", { "r.role_id": "ur.role_id" })
        .leftJoin("contacts as c", { "ur.user_id": "c.user_account" })
        .where({ "r.role_name": "Engagements - User" });

    return builder;
};

const selectBuilder = (connection: Knex, args: Args) => {
    const builder = selectBaseBuilder(connection);

    builder
        .clearSelect()
        .select("c.contact_id as contact_id", "c.first_name as first_name", "c.last_name as last_name")
        .orderBy("c.last_name")
        .limit(args.perPage)
        .offset((args.page - 1) * args.perPage);

    return builder;
};
