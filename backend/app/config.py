import os
from pathlib import Path
from pydantic import BaseModel, Field

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
NETCDF_DIR = DATA_DIR / "netcdf"
ARGO_DIR = DATA_DIR / "argo"

class DataSourcesConfig(BaseModel):

    google_earth_api_key: str = os.getenv("GOOGLE_EARTH_API_KEY", os.getenv("GOOGLE_MAPS_API_KEY", ""))

    cmems_username: str = os.getenv("CMEMS_USERNAME", "YOUR_CMEMS_USERNAME")
    cmems_password: str = os.getenv("CMEMS_PASSWORD", "YOUR_CMEMS_PASSWORD")

    cmems_phy_dataset_id: str = "cmems_mod_glo_phy_my_0.083deg_P1D-m"
    cmems_local_netcdf: str = str(NETCDF_DIR / "arabian_sea_copernicus_extract.nc")

    noaa_erddap_url: str = os.getenv(
        "NOAA_ERDDAP_URL",
        "https://coastwatch.pfeg.noaa.gov/erddap/griddap/oscar_currents_interim_2019.json",
    )
    noaa_oscar_local_netcdf: str = str(NETCDF_DIR / "arabian_sea_currents.nc")

    nasa_earthdata_token: str = os.getenv("NASA_EARTHDATA_TOKEN", "YOUR_EARTHDATA_APP_KEY")
    nasa_modis_aqua_url: str = "https://oceandata.sci.gsfc.nasa.gov/ob/getfile/"
    nasa_chlorophyll_local_netcdf: str = str(NETCDF_DIR / "arabian_sea_chlorophyll.nc")

    argo_gdac_http_mirror: str = "https://data-argo.ifremer.fr/"
    argo_gdac_ftp: str = "ftp://ftp.ifremer.fr/ifremer/argo"
    argo_local_dir: str = str(ARGO_DIR)

    default_interpolation_method: str = "bilinear"
    argo_proximity_threshold_km: float = 150.0
    arabian_sea_bbox: dict = Field(
        default_factory=lambda: {
            "lat_min": 5.0,
            "lat_max": 25.0,
            "lon_min": 50.0,
            "lon_max": 78.0,
        }
    )

config = DataSourcesConfig()
