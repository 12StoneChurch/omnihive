import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { addAuditLogEntry } from "@12stonechurch/omnihive-worker-common/helpers/MpHelper";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";

type TrainingModule = {
    trainingModuleId: number;
    title: string;
    slug: string;
    subModules: TrainingSubModule[];
    displayOrder: number;
    progress: number;
    events: EventData[];
};

type TrainingSubModule = {
    trainingModuleId: number;
    trainingSubmoduleId: number;
    title: string;
    slug: string;
    numberOfPages: number;
    formId: string;
    displayOrder: number;
    trainingUserProgressId: number;
    completed: boolean;
    completionDate: Date;
};

type EventData = {
    id: number;
    digital: boolean;
    eventParticipantId: number;
};

export default class GetTrainingData extends HiveWorkerBase implements IGraphEndpointWorker {
    private trainingModules: TrainingModule[] = [];
    private rootUrl: string | undefined;
    private dataUrl: string | undefined;
    private graphService: GraphService = new GraphService();

    /**
     * args:
     *  {
     *    trainingId: number
     *    userId: number
     *  }
     */
    public execute = async (customArgs: any, _omniHiveContext: GraphContext): Promise<TrainingModule[]> => {
        try {
            const userId: number = customArgs.userId;

            const trainingId: number = customArgs.trainingId;
            if (!userId || !trainingId) {
                throw Error("userId and trainingId are both required arguments.");
            }

            await this.graphService.init(this.registeredWorkers, this.environmentVariables);

            this.rootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");
            this.dataUrl = this.rootUrl + "/server1/builder2/ministryplatform";
            this.graphService.graphRootUrl = this.dataUrl;

            await this.getTrainingModule(trainingId);

            if (this.trainingModules) {
                await this.getTrainingSubModules();

                if (this.trainingModules.some((x) => x.subModules.length > 0)) {
                    await this.userProgress(userId);
                }

                await this.getEventData();
                await this.getEventParticipantData(userId);
            }

            return this.trainingModules;
        } catch (err) {
            throw err;
        }
    };

    private getTrainingModule = async (trainingId: number) => {
        const query: string = `{
            data: dboTrainingModules(
              where: {and: [{trainingId: {eq: ${trainingId}}}, {archived: {notEq: 1}}]}
            ) {
              trainingModuleId
              title
              slug
              displayOrder
            }
          }`;

        const results = (await this.graphService.runQuery(query)).data;

        for (const item of results) {
            item["progress"] = 0;
            item["events"] = [];
            this.trainingModules.push(item);
        }
    };

    private getTrainingSubModules = async () => {
        const query = `{
            data: dboTrainingSubmodules(
              where: {and: [
                    {
                        trainingModuleId: {
                            in: [${this.trainingModules.map((x) => x.trainingModuleId).join(",")}]}
                    }, 
                    { archived: { notEq: 1 } }
                ]}
            ) {
                trainingSubmoduleId
                title
                slug
                displayOrder
                numberOfPages
                formId
                trainingModuleId
            }
          }`;

        const results = (await this.graphService.runQuery(query)).data;

        for (const item of results) {
            const parent = this.trainingModules.find((x) => x.trainingModuleId === item.trainingModuleId);

            if (parent) {
                if (parent.subModules) {
                    parent.subModules = [];
                }

                item["completed"] = false;
                item["completionDate"] = null;
                item["trainingUserProgressId"] = 0;
                parent.subModules.push(item);
            }
        }
    };

    private userProgress = async (userId: number) => {
        const query = `{
            data: dboTrainingUserProgress(
              where: {
                    and: [
                        {
                            userId: { eq: ${userId} }
                        }, 
                        {
                            trainingSubmoduleId: {
                                in: [
                                    ${this.trainingModules
                                        .map((x) => x.subModules.map((y: any) => y.trainingSubModuleId))
                                        .flat(Infinity)
                                        .join(",")}
                                    ]
                                }
                            }
                        ]
                    }
            ) {
              trainingUserProgressId
              userId
              trainingSubmoduleId
              completionDate
            }
          }
        `;

        const results = (await this.graphService.runQuery(query)).data;

        for (const item of results) {
            const parent = this.trainingModules.find((x) =>
                x.subModules.some((y) => y.trainingSubmoduleId === item.trainingSubmoduleId)
            );

            if (parent) {
                const submodule = parent.subModules.find((x) => x.trainingSubmoduleId === item.trainingSubModuleId);

                if (submodule) {
                    submodule["completed"] = true;
                    submodule["completionDate"] = item.completionDate;
                    submodule["trainingUserProgressId"] = item.trainingUserProgressId;
                }

                parent["progress"] = Math.ceil(
                    (parent.subModules.filter((x) => x.completed).length / parent.subModules.length) * 100
                );
            }
        }
    };

    private getEventData = async () => {
        const query = `
            {
                data: dboEvents(where: {trainingModuleId:{in: [${this.trainingModules
                    .map((x) => x.trainingModuleId)
                    .join(",")}]}}) {
                    eventId
                    trainingModuleId
                    digitalEvent
                }
            }
        `;

        const results = (await this.graphService.runQuery(query)).data;

        for (const item of results) {
            const parent = this.trainingModules.find((x) => x.trainingModuleId === item.trainingModuleId);

            if (parent && parent.events) {
                parent.events.push({
                    id: item.eventId,
                    digital: item.digital,
                    eventParticipantId: 0,
                });
            }
        }
    };

    private getEventParticipantData = async (userId: number) => {
        const query = `
            {
                data: dboContacts(where: {userAccount: {eq: ${userId}}}) {
                    contactId
                    participantRecord_table(join: {type: inner, whereMode: specific}) {
                        dboEventParticipants_table(
                            join: {type: inner, whereMode: specific, from: participantId}
                            where: {and: [{participationStatusId: {eq: 3}}, {eventId: {in: [${this.trainingModules
                                .map((x) => x.events.map((y: any) => y.id))
                                .flat(Infinity)
                                .join(",")}]}}]}) {
                                participantId
                                eventParticipantId
                                eventId
                        }
                    }
                }
            }
          `;

        const results = (await this.graphService.runQuery(query)).data;

        for (const item of results) {
            if (!item.participantId) {
                item.participantId = await this.createParticipantRecord(item.contactId);
            }
        }
    };

    private createParticipantRecord = async (contactId: number) => {
        const participantMutation = `
            mutation {
                data: insert_dboParticipants(insert: {
                    contactId: ${contactId}
                    participantTypeId: 10
                    participantStartDate: { raw: "GetDate()" }
                    _2_inGroupLife: false
                    _2_isLeading: false
                    _2_isServing: false
                    domainId:1
                    }
                ) {
                    participantId
                }
            }`;

        const participantId = (await this.graphService.runQuery(participantMutation)).data[0].participantId;

        await this.addParticipantAuditLog(participantId);

        const contactMutation = `
            mutation {
                update_dboContacts(
                    updateTo: { participantRecord: 123455 }
                    where: { contactId: { eq: 12345 } }
                ) {
                    contactId
                }
            }
        `;

        const returnedContactId = (await this.graphService.runQuery(contactMutation)).data[0].contactId;

        await this.addContactAuditLog(returnedContactId, participantId);

        return participantId;
    };

    private addParticipantAuditLog = async (id: number) => {
        const auditObject = {
            log: {
                tableName: "Participants",
                recordId: id,
                description: "Created",
                username: "***Default Contact",
                userId: 5690,
                datetime: new Date(),
            },
        };

        await addAuditLogEntry(
            auditObject,
            this.getWorker(HiveWorkerType.Database, "dbMinistryPlatform") as IDatabaseWorker
        );
    };

    private addContactAuditLog = async (id: number, participantId: number) => {
        const auditObject = {
            log: {
                tableName: "Contacts",
                recordId: id,
                description: "Updated",
                username: "***Default Contact",
                userId: 5690,
                datetime: new Date(),
            },
            detail: {
                field: {
                    name: "Participant_Record",
                    label: "Participant Record",
                },
                value: {
                    new: participantId,
                    previous: "",
                },
            },
        };

        await addAuditLogEntry(
            auditObject,
            this.getWorker(HiveWorkerType.Database, "dbMinistryPlatform") as IDatabaseWorker
        );
    };
}
