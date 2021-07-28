/// <reference path="../../../types/globals.omnihive.d.ts" />

import { ITaskEndpointWorker } from "@withonevision/omnihive-core/interfaces/ITaskEndpointWorker";
import { HiveWorkerBase } from "@withonevision/omnihive-core/models/HiveWorkerBase";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";
import { AddressType, Client, GeocodeResult } from "@googlemaps/google-maps-services-js";
import { serializeError } from "serialize-error";
import dayjs from "dayjs";
import { AddressModel } from "@12stonechurch/omnihive-worker-common/models/AddressModel";
import { updateAddress } from "../common/updateAddress";
import { IsHelper } from "@withonevision/omnihive-core/helpers/IsHelper";

export default class GeocodingAutomation extends HiveWorkerBase implements ITaskEndpointWorker {
    public execute = async (): Promise<any> => {
        try {
            const webRootUrl = this.getEnvironmentVariable<string>("OH_WEB_ROOT_URL");

            if (IsHelper.isNullOrUndefined(webRootUrl)) {
                throw new Error("Web Root URL undefined");
            }

            const graphUrl = webRootUrl + this.metadata.dataUrl;

            await GraphService.getSingleton().init(this.registeredWorkers, this.environmentVariables);
            GraphService.getSingleton().graphRootUrl = graphUrl;

            const query = `
                query {
                    proc: storedProcedures {
                        data: api_12Stone_Custom_Addresses_GetNotGeocoded(DomainId:"1")
                    }
                }
                
            `;

            const addresses = (await GraphService.getSingleton().runQuery(query))?.proc?.[0]?.data?.[0];
            const client = new Client({});

            for (const address of addresses) {
                const geoResponse = await client.geocode({
                    params: {
                        address: `${address.AddressLine1} ${address.City}, ${address.StateRegion} ${address.PostalCode}`,
                        key: this.metadata.googleApiKey,
                    },
                });

                const result: GeocodeResult = geoResponse.data.results?.[0];

                const mutateObject: AddressModel = {
                    AddressId: address.AddressId,
                    Latitude: result?.geometry?.location?.lat.toString() ?? "0",
                    Longitude: result?.geometry?.location?.lng.toString() ?? "0",
                    LocationType: result.geometry.location_type,
                    PartialMatch: result.partial_match ?? false,
                    GeocodeResultsCount: geoResponse.data.results.length,
                    DoNotGeocode: false,
                    Geocoded: true,
                    LastGeoCodeAttempt: dayjs().format("YYYY-MM-DDTHH:mm:ss"),
                    PoliticalLocality: result.address_components?.filter(
                        (x) => x.types.includes(AddressType.locality) && x.types.includes(AddressType.political)
                    )?.[0]?.long_name,
                    County: result.address_components.filter(
                        (x) =>
                            x.types.includes(AddressType.administrative_area_level_2) &&
                            x.types.includes(AddressType.political)
                    )?.[0]?.long_name,
                };

                await updateAddress(mutateObject, graphUrl);
            }
        } catch (err) {
            throw new Error(JSON.stringify(serializeError(err)));
        }
    };
}
