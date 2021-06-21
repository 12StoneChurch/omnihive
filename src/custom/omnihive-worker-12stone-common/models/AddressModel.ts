export type AddressModel = {
    AddressId: number;
    AddressLine1?: string;
    AddressLine2?: string;
    City?: string;
    StateRegion?: string;
    PostalCode?: string;
    ForeignCountry?: string;
    County?: string;
    Latitude?: string;
    Longitude?: string;
    LocationType?: string;
    PartialMatch?: boolean;
    GeocodeResultsCount?: number;
    PoliticalLocality?: string;
    Altitude?: string;
    DoNotGeocode?: boolean;
    Geocoded?: boolean;
    DateGeocoded?: string;
    LastGeoCodeAttempt?: string;
    Country?: string;
};