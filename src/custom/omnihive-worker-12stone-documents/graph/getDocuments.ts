import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import { Knex } from "knex";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import DocuSignWorker from "@12stonechurch/omnihive-worker-docusign";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import dayjs from "dayjs";
import { getDatabaseObjects } from "@12stonechurch/omnihive-worker-common/helpers/GenericFunctions";
import { getDocumentUrl } from "../common/getDocumentUrl";
import { AwaitHelper } from "@withonevision/omnihive-core/helpers/AwaitHelper";

export default class GetDocuments extends HiveWorkerBase implements IGraphEndpointWorker {
    private databaseWorker?: IDatabaseWorker;
    private knex?: Knex;

    public execute = async (customArgs: any, omniHiveContext: GraphContext): Promise<{}> => {
        await AwaitHelper.execute(verifyToken(omniHiveContext));

        const { databaseWorker, knex } = getDatabaseObjects(this, "dbMinistryPlatform");
        this.databaseWorker = databaseWorker;
        this.knex = knex;

        const dbEnvelopes = await AwaitHelper.execute(this.getUserEnvelopes(customArgs.contactId));

        const docusignWorker = this.getWorker<DocuSignWorker>(HiveWorkerType.Unknown, "DocuSignWorker");

        const validEnvelopeIds = dbEnvelopes
            .map((data) => {
                return data.envelopeId;
            })
            .filter((data) => data);

        const dsEnvelopes = await docusignWorker?.getStatusByEnvelopeIdList(validEnvelopeIds);

        const results = await AwaitHelper.execute(
            Promise.all([this.syncDocumentStatus(dbEnvelopes, dsEnvelopes), this.getExtendedData(customArgs.contactId)])
        );

        await AwaitHelper.execute(this.populateUrl(results[1], customArgs.contactId, customArgs.redirectUrl));

        return results[1];
    };

    private getUserEnvelopes = async (contactId: number) => {
        if (!this.databaseWorker) {
            throw new Error("The database worker is not configured properly");
        }

        if (!this.knex) {
            throw new Error("Knex has not been properly initialized");
        }

        const queryBuilder = this.knex.queryBuilder();
        queryBuilder.from("DocuSign_Envelopes as de");
        queryBuilder.where("de.Contact_ID", this.knex.raw(contactId));
        queryBuilder.leftJoin("DocuSign_Envelope_Statuses as des", "des.DocuSign_Envelope_Status_ID", "de.Status_ID");
        queryBuilder.select("de.DocuSign_Envelope_ID as id", "de.Envelope_ID as envelopeId", "des.Status as status");

        return (await AwaitHelper.execute(this.databaseWorker.executeQuery(queryBuilder.toString())))[0];
    };

    private syncDocumentStatus = async (
        database: { id: number; envelopeId: string; status: string }[],
        docusign: any[] | undefined
    ) => {
        if (docusign) {
            for (const doc of database) {
                const syncingDoc = docusign.find((x) => x.envelopeId === doc.envelopeId);

                if (syncingDoc && doc.status.toLowerCase() !== syncingDoc.status.toLowerCase()) {
                    const newStatusId = await AwaitHelper.execute(this.getStatusId(syncingDoc.status));
                    await AwaitHelper.execute(
                        this.updateDocStatus(doc.id, newStatusId, syncingDoc.updateTime, syncingDoc.completedDateTime)
                    );
                }
            }
        }
    };

    private getStatusId = async (status: string) => {
        if (!this.databaseWorker) {
            throw new Error("The database worker is not configured properly");
        }

        if (!this.knex) {
            throw new Error("Knex has not been properly initialized");
        }

        const queryBuilder = this.knex.queryBuilder();

        queryBuilder.from("DocuSign_Envelope_Statuses as des");
        queryBuilder.whereRaw(`des.Status = '${status}'`);
        queryBuilder.select("des.DocuSign_Envelope_Status_ID as statusId");

        return (await AwaitHelper.execute(this.databaseWorker.executeQuery(queryBuilder.toString())))[0][0].statusId;
    };

    private updateDocStatus = async (id: number, statusId: number, updateTime: any, completionTime: any) => {
        if (!this.databaseWorker) {
            throw new Error("The database worker is not configured properly");
        }

        if (!this.knex) {
            throw new Error("Knex has not been properly initialized");
        }

        const updatedDateTime = dayjs(updateTime).format("YYYY-MM-DD hh:mm:ss a");

        const updateObject: any = {
            Status_ID: statusId,
            _Last_Updated_Date: updatedDateTime,
        };

        if (completionTime) {
            updateObject["Completion_Date"] = dayjs(completionTime).format("YYYY-MM-DD hh:mm:ss a");
        }

        const queryBuilder = this.knex.queryBuilder();
        queryBuilder.from("DocuSign_Envelopes");
        queryBuilder.where("DocuSign_Envelope_ID", id);
        queryBuilder.update(updateObject);

        return await AwaitHelper.execute(this.databaseWorker.executeQuery(queryBuilder.toString()));
    };

    private getExtendedData = async (contactId: number) => {
        if (!this.databaseWorker) {
            throw new Error("The database worker is not configured properly");
        }

        if (!this.knex) {
            throw new Error("Knex has not been properly initialized");
        }

        const queryBuilder = this.knex.queryBuilder();

        queryBuilder.from("DocuSign_Forms as df");
        queryBuilder.leftJoin("DocuSign_Envelopes as de", (query) => {
            if (!this.knex) {
                throw new Error("Knex has not been properly initialized");
            }

            query.on("de.Form_ID", "df.DocuSign_Form_ID");
            query.andOn("de.Contact_ID", this.knex.raw(contactId));
        });
        queryBuilder.leftJoin("DocuSign_Envelope_Statuses as des", "des.DocuSign_Envelope_Status_ID", "de.Status_ID");
        queryBuilder.where("df.Archived", 0);
        queryBuilder.andWhere((query) => {
            query.whereRaw("de.DocuSign_Envelope_ID is not null");
            query.orWhere("df.Globally_Available", 1);
        });
        queryBuilder.select(
            "de.Contact_ID as contactId",
            "df.DocuSign_Form_ID as formId",
            "df.Name as formName",
            "de.DocuSign_Envelope_ID as documentId",
            "des.Status as status",
            "de.Completion_Date as completionDate",
            "de._Created_Date as createdDate",
            "de._Last_Updated_Date as updatedDate"
        );

        return (await AwaitHelper.execute(this.databaseWorker.executeQuery(queryBuilder.toString())))[0];
    };

    private populateUrl = async (documents: any, contactId: number, redirectUrl: string) => {
        const urls = await AwaitHelper.execute(
            Promise.all(
                documents.map(async (doc: any) => {
                    let url = "";

                    if (doc.documentId) {
                        url = await AwaitHelper.execute(getDocumentUrl(this, contactId, redirectUrl, doc.documentId));
                    }

                    return {
                        id: doc.documentId,
                        url: url,
                    };
                })
            )
        );

        for (const doc of documents) {
            const docUrlObject: any = urls.find((x: any) => x.id === doc.documentId);
            if (docUrlObject) {
                doc.url = docUrlObject.url;
            }
        }
    };
}
