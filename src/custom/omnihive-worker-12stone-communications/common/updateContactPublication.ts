import { runGraphQuery } from "../lib/services/GraphService";
import { getMutationPropsString } from "@12stonechurch/omnihive-worker-common/helpers/GenericFunctions";

export const updateContactPublication = async (id: number, updates: any) => {
    const insert = `
        mutation {
            update_DpContactPublication(
            updateObject: {
                ${getMutationPropsString(updates)}
            },
            whereObject: {
                contactPublicationId: "= ${id}"
            }
            )
        }
      
    `;

    await runGraphQuery(insert);
};
