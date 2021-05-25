import { AddressModel } from "@12stonechurch/omnihive-worker-common/models/AddressModel";
import { GraphService } from "@12stonechurch/omnihive-worker-common/services/GraphService";

export const updateAddress = async (model: AddressModel, dataUrl: string) => {
    if (model?.AddressId) {
        const updateQuery = `
            mutation {
                data: update_Address(updateObject:{
                    ${model.AddressLine1 ? `addressLine1: "${model.AddressLine1}"` : ""}
                    ${model.AddressLine2 ? `addressLine2: "${model.AddressLine2}"` : ""}
                    ${model.City ? `city: "${model.City}"` : ""}
                    ${model.StateRegion ? `stateRegion: "${model.StateRegion}"` : ""}
                    ${model.PostalCode ? `postalCode: "${model.PostalCode}"` : ""}
                    ${model.ForeignCountry ? `foreignCountry: "${model.ForeignCountry}"` : ""}
                    ${model.Latitude ? `latitude: "${model.Latitude}"` : ""}
                    ${model.Longitude ? `longitude: "${model.Longitude}"` : ""}
                    ${model.LocationType ? `locationType: "${model.LocationType}"` : ""}
                    ${model.PartialMatch ? `partialMatch: ${model.PartialMatch}` : ""}
                    ${model.GeocodeResultsCount ? `geocodeResultsCount: ${model.GeocodeResultsCount}` : ""}
                    ${model.DoNotGeocode ? `doNotGeocode: ${model.DoNotGeocode}` : ""}
                    ${model.Geocoded ? `geocoded: ${model.Geocoded}` : ""}
                    ${model.LastGeoCodeAttempt ? `lastGeoCodeAttempt: "${model.LastGeoCodeAttempt}"` : ""}
                    ${model.County ? `county: "${model.County}"` : ""}
                    ${model.PoliticalLocality ? `politicalLocality: "${model.PoliticalLocality}"` : ""}
                    ${model.Country ? `country: "${model.Country}"` : ""}
                },
                whereObject: {
                    addressId: "= ${model.AddressId}"
                })
            }
    `;

        GraphService.getSingleton().graphRootUrl = dataUrl;
        return (await GraphService.getSingleton().runQuery(updateQuery))?.data;
    }
};
