import { serializeError } from "serialize-error";
import { IDatabaseWorker } from "src/packages/omnihive-core/interfaces/IDatabaseWorker";

type AuditObject = {
    log: LogObject;
    detail?: DetailObject;
};

type LogObject = {
    tableName: string;
    recordId: number;
    description: string;
    username: string;
    userId: number;
    datetime: Date;
    behalf?: {
        userId: number;
        username: string;
    };
    impersonate?: {
        userId: number;
        username: string;
    };
};

type DetailObject = {
    field: DetailFieldObject;
    id?: DetailChangeObject;
    value?: DetailChangeObject;
};

type DetailFieldObject = {
    name: string;
    label: string;
};

type DetailChangeObject = {
    previous: any;
    new: any;
};

export const addAuditLogEntry = async (auditObject: AuditObject, databaseWorker: IDatabaseWorker) => {
    try {
        const logObject: any = {
            Table_Name: auditObject.log.tableName,
            Record_ID: auditObject.log.recordId,
            Audit_Description: auditObject.log.description,
            User_Name: auditObject.log.username,
            User_ID: auditObject.log.userId,
            Date_Time: auditObject.log.datetime,
        };
        if (auditObject.log.behalf) {
            logObject.On_Behalf_Of_User_ID = auditObject.log.behalf.userId;
            logObject.On_Behalf_Of_User_Name = auditObject.log.behalf.username;
        }
        if (auditObject.log.impersonate) {
            logObject.Impersonated_By_User_ID = auditObject.log.impersonate.userId;
            logObject.Impersonated_By_User_Name = auditObject.log.impersonate.username;
        }

        const logInsert = databaseWorker.connection.queryBuilder();
        logInsert.from("dp_Audit_Log");
        logInsert.insert(logObject, ["Audit_Item_ID"]);

        const auditLogResults = await databaseWorker.executeQuery(logInsert.toString());
        const auditItemId = auditLogResults[0][0].Audit_Item_ID;
        if (auditObject.detail) {
            const detailObject: any = {
                Audit_Item_ID: auditItemId,
                Field_Name: auditObject.detail.field.name,
                Field_Label: auditObject.detail.field.label,
            };
            if (auditObject.detail.value) {
                detailObject.Previous_Value = auditObject.detail.value.previous;
                detailObject.New_Value = auditObject.detail.value.new;
            }
            if (auditObject.detail.id) {
                detailObject.Previous_ID = auditObject.detail.id.previous;
                detailObject.New_ID = auditObject.detail.id.new;
            }

            const detailInsert = databaseWorker.connection.queryBuilder();
            detailInsert.from("dp_Audit_Detail");
            detailInsert.insert(detailObject);
            await databaseWorker.executeQuery(detailInsert.toString());
        }
    } catch (err) {
        throw new Error(JSON.stringify(serializeError(err)));
    }
};
