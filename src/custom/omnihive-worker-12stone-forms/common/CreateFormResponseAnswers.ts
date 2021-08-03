import { IDatabaseWorker } from "@withonevision/omnihive-core/interfaces/IDatabaseWorker";

export async function createFormResponseAnswers(
    formId: number,
    responseId: number,
    formData: any,
    databaseWorker: IDatabaseWorker
) {
    try {
        // Get Form Fields
        const formFields: any = (
            await databaseWorker.executeQuery(
                `exec api_12Stone_Custom_Forms_GetFormById @FormId=${formId}, @DomainId='1'`
            )
        )[0];

        for (const field of formFields) {
            const codeKey: string = field.FieldCodeModelProperty;

            if (codeKey in formData) {
                const insertObject: any = {};
                insertObject["Form_Field_ID"] = field.FormFieldId;
                insertObject["Response"] = formData[codeKey].toString();
                insertObject["Form_Response_ID"] = responseId;
                insertObject["Domain_ID"] = 1;

                const queryBuilder = databaseWorker.connection.queryBuilder();
                queryBuilder.insert(insertObject);
                queryBuilder.from("Form_Response_Answers");

                databaseWorker.executeQuery(queryBuilder.toString());
            }
        }
    } catch (err) {
        throw err;
    }
}
