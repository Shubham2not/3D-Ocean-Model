import { Entity } from 'resium';
import * as Cesium from 'cesium';
import { OCEAN_REGIONS } from '../../config/regions';

export default function WaterBodyLabels() {
  return (
    <>
      {OCEAN_REGIONS.map((region) => {

        const position = Cesium.Cartesian3.fromDegrees(region.lon, region.lat, 200);

        return (
          <Entity
            key={region.name}
            id={`region-label-${region.name.replace(/\s+/g, '-').toLowerCase()}`}
            name={region.name}
            position={position}
            label={{
              text: region.subtitle
                ? `${region.name}\n${region.subtitle}`
                : region.name,
              font: 'italic 500 22px "Georgia", "Times New Roman", serif',
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,

              fillColor: Cesium.Color.fromCssColorString('rgba(200, 220, 240, 0.85)'),
              outlineColor: Cesium.Color.fromCssColorString('rgba(5, 15, 35, 0.7)'),
              outlineWidth: 3,

              showBackground: true,
              backgroundColor: Cesium.Color.fromCssColorString('rgba(8, 16, 32, 0.25)'),
              backgroundPadding: new Cesium.Cartesian2(14, 8),

              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              verticalOrigin: Cesium.VerticalOrigin.CENTER,

              disableDepthTestDistance: Number.POSITIVE_INFINITY,

              translucencyByDistance: new Cesium.NearFarScalar(
                1_500_000,   
                1.0,         
                8_000_000,   
                0.0          
              ),

              scaleByDistance: new Cesium.NearFarScalar(
                1_000_000,   
                1.0,
                6_000_000,   
                0.6
              ),

              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10_000_000),
            }}
          />
        );
      })}
    </>
  );
}
