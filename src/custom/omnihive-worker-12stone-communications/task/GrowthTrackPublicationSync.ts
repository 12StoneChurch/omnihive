import { ITaskEndpointWorker } from "@withonevision/omnihive-core/interfaces/ITaskEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { Listr } from "listr2";
import { addContactPublication } from "../common/addContactPublication";
import { updateContactPublication } from "../common/updateContactPublication";
import { runCustomSql, setGraphUrl } from "../lib/services/GraphService";

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
        setGraphUrl(`${this.serverSettings.config.webRootUrl}/${this.config.metadata.dataSlug}`);

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
                task: (_ctx: any, task: any): Listr =>
                    task.newListr(
                        this.contacts.map((contact) => ({
                            title: `Contact #${contact.contactId}`,
                            task: async () => this.updatePublications(contact),
                            retry: 5,
                            options: {
                                persistentOutput: true,
                                showTimer: true,
                                suffixRetries: true,
                                showSubtasks: true,
                            },
                        })),
                        { concurrent: true }
                    ),
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
            }[] = await runCustomSql(query);

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
        } catch (err) {
            throw new Error(JSON.stringify(err));
        }
    };

    private updatePublications = async (contact: {
        contactId: number;
        modules: number[];
        pubSubId: number;
        unsubscribed: boolean;
    }): Promise<void> => {
        if (contact.modules.length >= this.numOfModules && !contact.unsubscribed && contact.pubSubId) {
            return await updateContactPublication(contact.pubSubId, this.updateObject);
        }
        if (!contact.pubSubId && contact.modules.length <= this.numOfModules) {
            return await addContactPublication(contact.contactId, this.publicationId);
        }
    };
}
