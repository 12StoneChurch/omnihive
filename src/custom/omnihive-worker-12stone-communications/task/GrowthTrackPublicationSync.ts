import { ITaskEndpointWorker } from "@withonevision/omnihive-core/interfaces/ITaskEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Listr } from "listr2";
import { IsHelper } from "@withonevision/omnihive-core/helpers/IsHelper";
import { addContactPublications } from "../common/addContactPublications";
import { updateContactPublications } from "../common/updateContactPublications";
import { init, runCustomSql, setGraphUrl } from "../lib/services/GraphService";

export default class QueueAutomation extends HiveWorkerBase implements ITaskEndpointWorker {
    private contacts: {
        contactId: number;
        modules: number[];
        pubSubId: number;
        unsubscribed: boolean;
    }[] = [];
    private publicationId: number = 207;
    private numOfModules = 3;
    private updateObject = {
        unsubscribe: true,
    };

    public execute = async (): Promise<any> => {
        const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

        if (IsHelper.isNullOrUndefined(webRootUrl)) {
            throw new Error("Web Root URL undefined");
        }

        const rootUrl: string = `${webRootUrl}${this.metadata.dataSlug}`;
        setGraphUrl(rootUrl);
        await init(this.registeredWorkers, this.environmentVariables);

        const tasks = new Listr<any>([
            {
                title: "Get Messages",
                task: async () => (this.contacts = await this.getContactIds()),
                retry: 5,
                options: {
                    persistentOutput: true,
                    showTimer: true,
                },
            },
            {
                title: "Update Publications",
                task: async () => this.updatePublications(),
            },
        ]);

        await tasks.run();
    };

    private getContactIds = async (): Promise<any> => {
        try {
            const query = `
                select distinct p.Contact_ID as contactId
                            ,tm.Training_Module_ID as module
                            ,dcp.Contact_Publication_ID as publicationContactId
                            ,dcp.Unsubscribed as unsubscribed
                from Events as e
                    inner join Training_Modules as tm
                        on tm.Training_Module_ID = e.Training_Module_ID
                            and tm.Training_ID = 1
                    inner join Event_Participants as ep
                        on ep.Event_ID = e.Event_ID
                            and ep.Participation_Status_ID = 3
                    inner join Participants as p
                        on p.Participant_ID = ep.Participant_ID
                    left join dp_Contact_Publications as dcp
                        on dcp.Contact_ID = p.Contact_ID
                            and dcp.Publication_ID = ${this.publicationId}
        `;

            const results: {
                contactId: number;
                module: number;
                publicationContactId: number;
                unsubscribed: boolean;
            }[] = (await runCustomSql(query))[0];

            const contactReturn: {
                contactId: number;
                modules: number[];
                pubSubId: number;
                unsubscribed: boolean;
            }[] = [];

            results.forEach((x) => {
                const index = contactReturn.findIndex((y) => y.contactId === x.contactId);
                if (index < 0) {
                    contactReturn.push({
                        contactId: x.contactId,
                        modules: [x.module],
                        pubSubId: x.publicationContactId,
                        unsubscribed: x.unsubscribed,
                    });
                } else {
                    if (!contactReturn[index].modules) {
                        contactReturn[index].modules = [x.module];
                    } else {
                        contactReturn[index].modules.push(x.module);
                    }
                }
            });

            return contactReturn;
        } catch (err) {
            throw new Error(JSON.stringify(err));
        }
    };

    private updatePublications = async (): Promise<void> => {
        const updatePublications = this.contacts
            .filter((x) => x.modules.length >= this.numOfModules && !x.unsubscribed && x.pubSubId)
            .map((x) => x.pubSubId);
        const newContacts = this.contacts
            .filter((x) => !x.pubSubId && x.modules.length <= this.numOfModules)
            .map((x) => x.contactId);
        if (updatePublications?.length > 0) {
            return await updateContactPublications(updatePublications, this.updateObject);
        }
        if (newContacts?.length > 0) {
            return await addContactPublications(newContacts, this.publicationId);
        }
    };
}
