import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { checkNamePlusTwo } from "@12stonechurch/omnihive-worker-contacts/common/CheckNamePlusTwo";
import { getUserById } from "@12stonechurch/omnihive-worker-users/common/GenericFunctions";
import { HiveWorkerType } from "@withonevision/omnihive-core/enums/HiveWorkerType";
import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";
import { createFormResponse } from "../common/CreateFormResponse";
import { createFormResponseAnswers } from "../common/CreateFormResponseAnswers";

export default class SubmitForm extends HiveWorkerBase implements IGraphEndpointWorker {
    private formData: any;
    private contact: any;

    public execute = async (customArgs: any, _omniHiveContext: GraphContext): Promise<any> => {
        const databaseWorker: IDatabaseWorker | undefined = await this.getWorker<IDatabaseWorker>(
            HiveWorkerType.Database
        );

        if (!databaseWorker) {
            throw new Error("Database worker is not configured properly");
        }

        if (!customArgs.formId) {
            throw new Error("Form Id is not specified");
        }

        if (!customArgs.formData) {
            throw new Error("Form Data is not populated properly");
        }

        this.formData = customArgs.formData;

        const valid: boolean = await this.validateInputs(customArgs.userId, databaseWorker);

        if (valid) {
            const responseId = await createFormResponse(customArgs.formId, this.contact, databaseWorker);
            const completed = await createFormResponseAnswers(
                customArgs.formId,
                responseId,
                this.formData,
                databaseWorker
            );

            return completed;
        } else {
            throw new Error("Data provided is not valid.");
        }
    };

    private validateInputs = async (userId: number, databaseWorker: IDatabaseWorker) => {
        if (userId) {
            this.contact = await getUserById(userId, databaseWorker);
        } else {
            this.contact = await checkNamePlusTwo(this.formData, databaseWorker);
        }

        if (this.contact.ContactId === 0) {
            // TODO: Create User
        }

        if ("FirstName" in this.formData && this.contact.FirstName) {
            this.formData.FirstName = this.contact.FirstName;
        }

        if ("LastName" in this.formData && this.contact.LastName) {
            this.formData.LastName = this.contact.LastName;
        }

        if ("Email" in this.formData && this.contact.EmailAddress) {
            this.formData.Email = this.contact.EmailAddress;
        }

        if ("Phone" in this.formData && this.contact.MobilePhone) {
            this.formData.Phone = this.contact.MobilePhone;
        }

        if ("DateOfBirth" in this.formData && this.contact.DateOfBirth) {
            this.formData.DateOfBirth = this.contact.DateOfBirth;
        }

        return this.formData;
    };
}
