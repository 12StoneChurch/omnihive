import { getExecuteContext } from "@12stonechurch/omnihive-worker-common/helpers/ExecuteHelper";
import { DanyService } from "@12stonechurch/omnihive-worker-common/services/DanyService";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import j from "joi";
import { serializeError } from "serialize-error";

import { MemberFormId } from "../common/constants";
import { addGroupParticipant } from "../queries/addGroupParticipant";
import { addParticipantRecord } from "../queries/addParticipantRecord";
import { getContact } from "../queries/getContact";
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
    public execute = async (rawArgs: unknown, context: GraphContext): Promise<{} | Error> => {
        try {
            const { args, knex, customGraph } = await getExecuteContext<Args>({
                worker: this,
                context,
                rawArgs,
                argsSchema,
            });

            // set up form id
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

            // submit mp form
            DanyService.getSingleton().setMetaData(this.metadata);
            const contactId = await submitMemberForm({ formId, ...args });

            // get contact
            const contact = await getContact(customGraph, { contactId });

            // create participant record if needed
            if (!contact.participantId) {
                const participantId = await addParticipantRecord(knex, { contactId: contact.id });
                contact.participantId = participantId;
            }

            // add participant to group
            await addGroupParticipant(knex, { participantId: contact.participantId, ...args });

            return {};
        } catch (err) {
            if (err instanceof Error) {
                console.log(JSON.stringify(serializeError(err)));
                return err;
            } else {
                console.log("An unknown error occurred.");
                return new Error("An unknown error occurred.");
            }
        }
    };
}
