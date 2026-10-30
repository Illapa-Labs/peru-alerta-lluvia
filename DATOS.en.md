[Español](DATOS.md) | **English**

# Data and attribution

The AGPL license of this repository covers the **code**, not the data. This page lists where each piece of data comes from, what license or terms it has according to what could be checked, and what is still to be confirmed. The review is dated 26 October 2026. If you find a mistake or a more recent condition, open an issue.

This project does not own this data and does not guarantee it.

| Data | Source | License or terms | Attribution and status |
|---|---|---|---|
| Rain warnings, ravine activation and district boundaries | [SENAMHI](https://www.gob.pe/senamhi) | No published reuse license was found | **Pending:** written permission will be requested from SENAMHI before redistributing its data |
| Population of districts and departments (2017 census) | INEI | Not verified | The source is cited. **Pending:** verify the reuse conditions |
| Satellite rainfall estimate (GOES-19) | NOAA, via AWS Open Data | Public NOAA data (free to use) | Attribution is requested; NOAA endorsement must not be implied and modified data must not be presented as original. The terms specific to this dataset were not verified |
| Fallback rainfall (IMERG) | NASA, via GIBS | NASA data is CC0 by default | Citation is requested. GIBS's own terms were not read |
| Forecast | [UK Met Office](https://www.metoffice.gov.uk) global 10 km model, via [Open-Meteo](https://open-meteo.com) | Met Office data: CC BY-SA 4.0 (Crown copyright). Open-Meteo's free API is for non-commercial use only | Attribution required, and anything derived from it (the API's forecast and its images) is shared under the same CC BY-SA 4.0 licence. The current use (no ads, no subscriptions) meets the non-commercial condition |
| Department outlines | Natural Earth | Public domain | No attribution required |
| Base map (streets) | OpenFreeMap, with OpenStreetMap and OpenMapTiles data | Its terms give no clear license and ask for no attribution, and the service may be discontinued | Attribution is shown on the map. **Pending:** verify the data license and plan to host our own tiles |
| Terrain | Mapzen / AWS Terrain Tiles | Attribution is in a document of the Joerd project that was not read | **Not used today:** the map is flat. It would come back with an on-demand 3D view, and its attribution must be settled then |

## Software dependencies

The libraries used by the prototype (MapLibre GL JS and others) have permissive licenses (BSD, MIT, ISC, Apache-2.0) or are in the public domain, all compatible with the AGPL. They will be reviewed again when the code is migrated.

## Acknowledgments

Thanks to SENAMHI for publishing the warnings, to the MapLibre, Open-Meteo, OpenStreetMap and Natural Earth projects, and to the UK Met Office, NOAA and NASA for opening their data.
