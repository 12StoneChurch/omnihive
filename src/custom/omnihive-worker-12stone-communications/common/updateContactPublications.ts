import { runGraphQuery } from "../lib/services/GraphService";
import { getMutationPropsString } from "@12stonechurch/omnihive-worker-common/helpers/GenericFunctions";

export const updateContactPublications = async (ids: number[], updates: any) => {
    const insert = `
        mutation {
            update_DpContactPublication(
                updateObject: {
                    ${getMutationPropsString(updates)}
                },
                whereObject: {
                    contactPublicationId: "in (${ids.join(",")})"
                }
            )
        }
      
    `;

    await runGraphQuery(insert);
};
