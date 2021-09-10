import { errorHelper } from "@12stonechurch/omnihive-worker-common/helpers/ErrorHelper";
import { getExecuteContext } from "@12stonechurch/omnihive-worker-common/helpers/ExecuteHelper";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import j from "joi";

import { MemberFormId } from "../common/constants";
import { addGroupParticipant } from "../queries/addGroupParticipant";
import { addParticipantRecord } from "../queries/addParticipantRecord";
import { getContact } from "../queries/getContact";
import { getParticipantExistsInGroup } from "../queries/getParticipantExistsInGroup";
import { submitMemberForm } from "../queries/submitMemberForm";

interface Args {
    groupId: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
}

const argsSchema = j.object({
    groupId: j.number().integer().positive().required(),
    firstName: j.string().required(),
    lastName: j.string().required(),
    email: j.string().email().required(),
    phone: j.string().optional(),
});

export default class AddGroupMember extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (rawArgs: unknown, context: GraphContext): Promise<{ [K in any]: never } | Error> => {
        try {
            const { args, knex, customGraph } = await getExecuteContext<Args>({
                worker: this,
                context,
                rawArgs,
                argsSchema,
            });

            let formId: number;

            switch (this.metadata.environment) {
                case "production":
                    formId = MemberFormId.PROD;
                    break;
                case "beta":
                    formId = MemberFormId.BETA;
                    break;
                case "development":
                    formId = MemberFormId.DEV;
                    break;
                default:
                    throw new Error(`Unknown metadata.environment value: ${this.metadata.environment}`);
            }

            DanyService.getSingleton().setMetaData(this.metadata);
            const contactId = await submitMemberForm({ formId, ...args });

            const contact = await getContact(customGraph, { contactId });

            await knex.transaction(async (trx) => {
                let participantId: number;

                if (!contact.participantId) {
                    participantId = await addParticipantRecord(trx, { contactId: contact.id });
                } else {
                    participantId = contact.participantId;
                }

                const exists = await getParticipantExistsInGroup(trx, { participantId, ...args });

                if (exists) {
                    throw new Error("Participant already exists in group.");
                }

                await addGroupParticipant(trx, { participantId, ...args });
            });

            return {};
        } catch (err) {
            return errorHelper(err);
        }
    };
}
