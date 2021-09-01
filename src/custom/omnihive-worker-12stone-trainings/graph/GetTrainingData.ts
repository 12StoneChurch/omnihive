import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";

type TrainingModule = {
    trainingModuleId: number;
    title: string;
    slug: string;
    subModules: TrainingSubModule[];
    displayOrder: number;
    progress: number;
    events: EventData[];
    digitalEventId: number;
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
            this.trainingModules = [];

            const userId: number = customArgs.userId;

            const trainingId: number = customArgs.trainingId;
            if (!userId || !trainingId) {
                throw Error("userId and trainingId are both required arguments.");
            }

            await this.graphService.init(this.registeredWorkers, this.environmentVariables);

            this.rootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");
            this.dataUrl = this.rootUrl + this.metadata.dataSlug;
            this.graphService.graphRootUrl = this.dataUrl ?? "";

            if (this.graphService.graphRootUrl.length > 0) {
                await this.getTrainingModule(trainingId);

                if (this.trainingModules) {
                    await this.getTrainingSubModules();

                    if (this.trainingModules.some((x) => x.subModules.length > 0)) {
                        await this.userProgress(userId);
                    }

                    await this.getEventData(userId);
                }

                return this.trainingModules;
            } else {
                throw new Error("GraphQL URL not specified");
            }
        } catch (err) {
            throw err;
        }
    };

    private getTrainingModule = async (trainingId: number) => {
        try {
            const query: string = `{
            data: dboTrainingModules(
              where: {and: [{trainingId: {eq: ${trainingId}}}, {archived: {notEq: true}}]}
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
        } catch (err) {
            throw err;
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
                    { archived: { notEq: true } }
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
                if (!parent.subModules) {
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
                                        .map((x) => x.subModules.map((y: any) => y.trainingSubmoduleId))
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
                const submodule = parent.subModules.find((x) => x.trainingSubmoduleId === item.trainingSubmoduleId);

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

    private getEventData = async (userId: number) => {
        const query = `
            {
                data: dboEvents(where: {trainingModuleId: {in: [${this.trainingModules
                    .map((x) => x.trainingModuleId)
                    .join(",")}]}}) {
                  eventId
                  trainingModuleId
                  digitalEvent
                  eventParticipantData: dboEventParticipants_table(
                    join: {type: left, from: eventId, whereMode: specific}
                    where: { participationStatusId: { eq: 3 } }
                  ) {
                    eventParticipantId
                    participantData: participantId_table(join: {type: left, whereMode: specific}) {
                      contactData: contactId_table(
                        join: {type: left, whereMode: global}
                        where: {userAccount: {eq: ${userId}}}
                      ) {
                        contactId
                      }
                    }
                  }
                }
              }
              
        `;

        const results = (await this.graphService.runQuery(query)).data;

        for (const item of results) {
            const parent = this.trainingModules.find((x) => x.trainingModuleId === item.trainingModuleId);

            if (parent && parent.events) {
                if (item.eventParticipantData?.[0]?.eventParticipantId) {
                    parent.events.push({
                        id: item.eventId,
                        eventParticipantId: item.eventParticipantData[0].eventParticipantId,
                    });
                }

                if (!parent.digitalEventId && item.digitalEvent) {
                    parent.digitalEventId = item.eventId;
                }
            }
        }
    };
}
