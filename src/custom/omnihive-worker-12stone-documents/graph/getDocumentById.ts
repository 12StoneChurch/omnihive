import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { getDatabaseObjects } from "@12stonechurch/omnihive-worker-common/helpers/GenericFunctions";
import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";

export default class GetDocumentById extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, omniHiveContext: GraphContext): Promise<{}> => {
        await verifyToken(omniHiveContext);

        const { databaseWorker, queryBuilder } = getDatabaseObjects(this, "dbMinistryPlatform");

        queryBuilder.from("DocuSign_Forms as df");
        queryBuilder.where("df.DocuSign_Form_ID", customArgs.templateId);
        queryBuilder.select(
            "df.DocuSign_Form_ID as templateId",
            "df.Name as templateName",
            "df.Globally_Available as global",
            "df.Archived as archived"
        );

        const results = (await databaseWorker.executeQuery(queryBuilder.toString()))?.[0]?.[0];

        await this.buildSignerData(databaseWorker, results);

        return results;
    };

    private buildSignerData = async (databaseWorker: IDatabaseWorker, results: any): Promise<any> => {
        const queryBuilder = databaseWorker.connection.queryBuilder();
        queryBuilder.from("DocuSign_Form_Signers as dfs");
        queryBuilder.where("dfs.Form_ID", results.templateId);
        queryBuilder.andWhereRaw("isNull(dfs.Archived, 0) = 0");
        queryBuilder.select(
            "dfs.DocuSign_Form_Signer_ID as roleId",
            "dfs.Signer_Role as role",
            "dfs.Form_ID as templateId"
        );

        const roles = (await databaseWorker.executeQuery(queryBuilder.toString()))?.[0];

        if (roles && roles.length > 0) {
            roles.map((x) => {
                if (!results.roles) {
                    results.roles = [];
                }

                if (results.templateId && x.templateId && results.templateId === x.templateId) {
                    results.roles.push({
                        roleId: x.roleId,
                        role: x.role,
                    });
                }
            });
        }
    };
}
