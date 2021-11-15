import { getDatabaseObjects } from "@12stonechurch/omnihive-worker-common/helpers/GenericFunctions";
import { verifyToken } from "@12stonechurch/omnihive-worker-common/helpers/TokenHelper";
import { IGraphEndpointWorker } from "@withonevision/omnihive-core/interfaces/IGraphEndpointWorker";
import { GraphContext } from "@withonevision/omnihive-core/models/GraphContext";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { getContactPhotoUrl } from "../common/GetContactPhoto";
import { GetExtendedContactArgs } from "@12stonechurch/omnihive-worker-common/models/custom-worker-args/graph/contacts/GetExtendedContactArgs";
import { GetExtendedContactReturn } from "@12stonechurch/omnihive-worker-common/models/custom-worker-returns/graph/contacts/GetExtendedContactReturn";

export default class GetExtendedUser extends HiveWorkerBase implements IGraphEndpointWorker {
    public execute = async (customArgs: GetExtendedContactArgs, omniHiveContext: GraphContext): Promise<any> => {
        await verifyToken(omniHiveContext);

        let args: GetExtendedContactArgs = new GetExtendedContactArgs(customArgs);
        args = args.validateProperties();

        const { databaseWorker, queryBuilder } = getDatabaseObjects(this, "dbMinistryPlatform");

        queryBuilder.from("Contacts as c");
        queryBuilder.where("c.User_Account", args.userId);
        queryBuilder.select(
            "c.User_Account as userId",
            "c.Contact_ID as contactId",
            "c.Contact_GUID as contactGuid",
            "c.First_Name as firstName",
            "c.Last_Name as lastName",
            "c.Nickname as nickname",
            "c.Display_Name as displayName",
            "c.Date_Of_Birth as dateOfBirth",
            "c.Gender_ID as genderId",
            "c.Email_Address as email",
            "c.Mobile_Phone as phone",
            "c.Participant_Record as participantRecord",
            "c.Email_Unlisted as emailUnlisted",
            "c.Mobile_Phone_Unlisted as mobilePhoneUnlisted",
            "c.Bulk_Email_Opt_Out as bulkEmailOptOut",
            "c.Bulk_Text_Opt_Out as bulkTextOptOut",
            "c.Remove_From_Directory as removeFromDirectory"
        );

        if (!args.disableUser) {
            queryBuilder.leftJoin("dp_Users as du", "du.User_ID", "c.User_Account");
            queryBuilder.select("du.Can_Impersonate as canImpersonate");
        }

        if (!args.disableSettings) {
            queryBuilder.leftJoin("Custom_Application_User_Settings as caus", "caus.User_ID", "c.User_Account");
            queryBuilder.select(
                "caus.Custom_Application_User_Settings_ID as customApplicationUserSettingsId",
                "caus.User_Settings as userSettings"
            );
        }

        if (!args.disableHousehold) {
            queryBuilder.leftJoin("Households as h", "h.Household_ID", "c.Household_ID");
            queryBuilder.select("h.Household_ID as householdId");

            if (!args.disableCongregation) {
                queryBuilder.leftJoin("Congregations as cong", "cong.Congregation_ID", "h.Congregation_ID");
                queryBuilder.select(
                    "cong.Congregation_ID as congregationId",
                    "cong.Congregation_Name as congregationName"
                );
            }

            if (!args.disableAddress) {
                queryBuilder.leftJoin("Addresses as a", "a.Address_ID", "h.Address_ID");
                queryBuilder.select(
                    "a.Address_ID as addressId",
                    "a.Address_Line_1 as addressLine1",
                    "a.Address_Line_2 as addressLine2",
                    "a.City as city",
                    "a.[State/Region] as stateRegion",
                    "a.Postal_Code as postalCode"
                );
            }
        }

        const results: GetExtendedContactReturn = (
            await databaseWorker.executeQuery(queryBuilder.toString())
        )[0][0] as GetExtendedContactReturn;

        if (!args.disableProfilePicture) {
            results.photoUrl = await getContactPhotoUrl(this, results.contactId);
        }

        let validatedResults: GetExtendedContactReturn = new GetExtendedContactReturn(results);
        validatedResults = validatedResults.validateProperties();

        return validatedResults;
    };
}
