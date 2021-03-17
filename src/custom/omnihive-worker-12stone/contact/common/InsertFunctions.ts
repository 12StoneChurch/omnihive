import { getMutationPropsString } from "../../lib/helpers/GenericFunctions";
import { GraphService } from "../../lib/services/GraphService";
import { UpdateAddressArgs, UpdateHouseholdArgs } from "../lib/models/UpdateModels";
import { updateHousehold } from "./UpdateFunctions";
import { validateAddress } from "./ValidationFunctions";

export async function insertAddress(householdId: number, data: UpdateAddressArgs) {
    try {
        validateAddress(data);

        const mutationProps = getMutationPropsString(data);

        if (mutationProps.length > 0) {
            const mutation = `
        mutation {
          data: insert_Addresses(
            addresses: [{
              ${mutationProps}
            }]
          ) {
            addressId
          }
        }
        `;

            const addressResults = (await GraphService.getSingleton().runQuery(mutation)).data;
            const returnCount = addressResults.length;
            const addressId: number = addressResults[0].addressId;

            if (addressId) {
                const householdData: UpdateHouseholdArgs = {
                    addressId: addressId,
                };

                await updateHousehold(householdId, householdData);
            }

            return returnCount;
        }
    } catch (err) {
        throw new Error(err);
    }
}
