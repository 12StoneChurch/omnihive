import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import DocuSignWorker from "@12stonechurch/omnihive-worker-docusign";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { Knex } from "knex";
import dayjs from "dayjs";
import { getContactData } from "../common/getContactData";
import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";

export default class GenerateDocument extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: any, omniHiveContext: GraphContext): Promise<{}> => {
        await verifyToken(omniHiveContext);

        const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

        const docusignWorker = this.getWorker<DocuSignWorker>("unknown", "DocuSignWorker");

        const templateId: string = await this.getDocuSignTemplateId(customArgs.templateId);

        const contactData: any = await getContactData(webRootUrl + this.metadata.customSlug, customArgs.contactId);
        const email = contactData.email;
        const name = `${contactData.nickname} ${contactData.lastName}`;

        if (docusignWorker) {
            const envelopeData: any = await docusignWorker.createEnvelope(templateId, email, name, customArgs.role);

            await this.storeEnvelopeData(customArgs.templateId, contactData.id, envelopeData);

            const url = await docusignWorker.getEnvelopeUrl(
                customArgs.redirectUrl,
                email,
                name,
                envelopeData.envelopeId
            );

            return { envelopeUrl: url };
        } else {
            throw new Error("DocuSign worker not found.");
        }
    };

    private getDocuSignTemplateId = async (id: number): Promise<string> => {
        const databaseWorker: IDatabaseWorker | undefined = this.getWorker<IDatabaseWorker>(
            HiveWorkerType.Database,
            "dbMinistryPlatform"
        );

        if (!databaseWorker) {
            throw new Error("Database worker not configured");
        }

        const queryBuilder: Knex.QueryBuilder = databaseWorker?.connection.queryBuilder();

        queryBuilder.from("DocuSign_Forms as df");
        queryBuilder.where("df.DocuSign_Form_ID", id);
        queryBuilder.select("df.Template_ID as id");

        const results = await databaseWorker.executeQuery(queryBuilder.toString());

        return results[0][0].id;
    };

    private storeEnvelopeData = async (formId: number, contactId: number, data: any): Promise<any> => {
        const databaseWorker: IDatabaseWorker | undefined = this.getWorker<IDatabaseWorker>(
            HiveWorkerType.Database,
            "dbMinistryPlatform"
        );

        if (!databaseWorker) {
            throw new Error("Database worker not configured");
        }

        const dateCreated: string = dayjs(data.statusDateTime).format("YYYY-MM-DD hh:mm:ssa");

        const insertData: any = {
            Contact_ID: contactId,
            Form_ID: formId,
            Envelope_ID: data.envelopeId,
            Created_Date: dateCreated,
            Last_Updated_Date: dateCreated,
            Domain_ID: 1,
        };

        const queryBuilder: Knex.QueryBuilder = databaseWorker?.connection.queryBuilder();
        queryBuilder.from("DocuSign_Envelopes");
        queryBuilder.insert(insertData);

        await databaseWorker.executeQuery(queryBuilder.toString());
    };
}
