// src/CesiumMap.tsx
import React, { useEffect, useRef } from "react";
import {
  Viewer,
  ScreenSpaceEventHandler,
  Math as CesiumMath,
  Cartesian3,
  HeadingPitchRoll,
  Transforms,
  HeightReference,
  Cartographic,
  sampleTerrainMostDetailed,
  Cesium3DTileset,
  createOsmBuildingsAsync,
  createWorldTerrainAsync,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

const CesiumMap: React.FC = () => {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const osmBuildingsTilesetRef = useRef<Cesium3DTileset | null>(null);

  useEffect(() => {
    const initializeCesium = async () => {
      if (!cesiumContainerRef.current) return;

      // Initialize Viewer
      const viewer = new Viewer(cesiumContainerRef.current, {
        terrainProvider: await createWorldTerrainAsync(),
        timeline: false,
        animation: false,
      });
      viewerRef.current = viewer;

      const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
      handlerRef.current = handler;

      // Add OSM Buildings
      const osmBuildingsTileset = await createOsmBuildingsAsync();
      osmBuildingsTilesetRef.current = osmBuildingsTileset;
      viewer.scene.primitives.add(osmBuildingsTileset);

      // Set initial camera view
      viewer.scene.camera.setView({
        destination: Cartesian3.fromDegrees(18.299756, 54.324447, 100),
        orientation: {
          heading: CesiumMath.toRadians(10),
          pitch: CesiumMath.toRadians(-10),
        },
      });

      // **Define terrainProvider outside the loop**
      const terrainProvider = viewer.terrainProvider;

      // **Add trees at intervals of 10 meters**

      // Starting coordinates
      const startLongitude = 18.29887 + 0.001; // Adjust as needed
      const startLatitude = 54.3249 + 0.00015;

      // Calculate degree offset for 10 meters
      const metersToDegreesLat = 10 / 111320; // Approximately 111.32 km per degree latitude
      const metersToDegreesLon =
        10 / ((40075000 * Math.cos(CesiumMath.toRadians(startLatitude))) / 360);

      for (let i = 0; i < 6; i++) {
        const treeLongitude = startLongitude + i * metersToDegreesLon;
        const treeLatitude = startLatitude;

        // Get terrain height at tree location
        const cartographicPosition = Cartographic.fromDegrees(
          treeLongitude,
          treeLatitude
        );
        const positions = [cartographicPosition];
        const updatedPositions = await sampleTerrainMostDetailed(
          terrainProvider,
          positions
        );

        const treeHeight = updatedPositions[0].height;

        const treePosition = Cartesian3.fromDegrees(
          treeLongitude,
          treeLatitude,
          treeHeight
        );
        const heading = CesiumMath.toRadians(0);
        const pitch = 0;
        const roll = 0;
        const hpr = new HeadingPitchRoll(heading, pitch, roll);
        const orientation = Transforms.headingPitchRollQuaternion(
          treePosition,
          hpr
        );

        // Add tree entity
        viewer.entities.add({
          name: `Maple Tree ${i + 1}`,
          position: treePosition,
          orientation: orientation,
          model: {
            uri: "models/maple_tree.glb",
            scale: 0.05, // Adjust scale as needed
            minimumPixelSize: 128,
            maximumScale: 20000,
          },
        });
      }

      // **Add tank model**

      // Tank coordinates (near the trees)
      const tankLongitude = startLongitude + 3 * metersToDegreesLon; // Halfway among the trees
      const tankLatitude = startLatitude - metersToDegreesLat * 2; // 5 meters south

      // Get terrain height at tank location
      const tankCartographicPosition = Cartographic.fromDegrees(
        tankLongitude,
        tankLatitude
      );
      const tankPositions = [tankCartographicPosition];
      const tankUpdatedPositions = await sampleTerrainMostDetailed(
        terrainProvider,
        tankPositions
      );

      const tankHeight = tankUpdatedPositions[0].height;

      const tankPosition = Cartesian3.fromDegrees(
        tankLongitude,
        tankLatitude,
        tankHeight
      );
      const tankHeading = CesiumMath.toRadians(0); // Adjust as needed
      const tankPitch = 0;
      const tankRoll = 0;
      const tankHpr = new HeadingPitchRoll(tankHeading, tankPitch, tankRoll);
      const tankOrientation = Transforms.headingPitchRollQuaternion(
        tankPosition,
        tankHpr
      );

      // Add tank entity
      viewer.entities.add({
        name: "Tank",
        position: tankPosition,
        orientation: tankOrientation,
        model: {
          uri: "models/tank.glb",
          scale: 1, // Adjust scale as needed
          minimumPixelSize: 128,
          maximumScale: 20000,
        },
      });
    };

    // Initialize Cesium
    initializeCesium();

    // Cleanup function
    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      if (handlerRef.current) {
        handlerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <div
        id="cesiumContainer"
        ref={cesiumContainerRef}
        style={{ width: "100%", height: "100vh" }}
      />
      {/* UI elements remain unchanged */}
    </div>
  );
};

export default CesiumMap;
