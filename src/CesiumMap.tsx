// src/CesiumMap.tsx
import React, { useEffect, useRef } from "react";
import {
  Viewer,
  ScreenSpaceEventHandler,
  Math as CesiumMath,
  Cartesian3,
  HeadingPitchRoll,
  Transforms,
  Cartographic,
  sampleTerrainMostDetailed,
  Cesium3DTileset,
  createOsmBuildingsAsync,
  createWorldTerrainAsync,
  JulianDate,
  Entity,
  ConstantPositionProperty,
  ConstantProperty,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

const CesiumMap: React.FC = () => {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const osmBuildingsTilesetRef = useRef<Cesium3DTileset | null>(null);
  const playerEntityRef = useRef<Entity | null>(null);

  useEffect(() => {
    const initializeCesium = async () => {
      if (!cesiumContainerRef.current) return;

      // Inicjalizacja Viewer
      const viewer = new Viewer(cesiumContainerRef.current, {
        terrainProvider: await createWorldTerrainAsync(),
        timeline: false,
        animation: false,
      });
      viewerRef.current = viewer;

      const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
      handlerRef.current = handler;

      // Dodanie budynków OSM
      const osmBuildingsTileset = await createOsmBuildingsAsync();
      osmBuildingsTilesetRef.current = osmBuildingsTileset;
      viewer.scene.primitives.add(osmBuildingsTileset);

      // Ustawienie początkowego widoku
      viewer.scene.camera.setView({
        destination: Cartesian3.fromDegrees(18.299756, 54.324447, 100),
        orientation: {
          heading: CesiumMath.toRadians(10),
          pitch: CesiumMath.toRadians(-10),
        },
      });

      // Definiowanie terrainProvider
      const terrainProvider = viewer.terrainProvider;

      // **Dodanie drzew w odstępach co 10 metrów**

      // Koordynaty początkowe
      const startLongitude = 18.29887 + 0.001; // Dostosuj według potrzeb
      const startLatitude = 54.3249 + 0.00015;

      // Przeliczenie 10 metrów na stopnie
      const metersToDegreesLat = 10 / 111320;
      const metersToDegreesLon =
        10 / ((40075000 * Math.cos(CesiumMath.toRadians(startLatitude))) / 360);

      for (let i = 0; i < 6; i++) {
        const treeLongitude = startLongitude + i * metersToDegreesLon;
        const treeLatitude = startLatitude;

        // Pobranie wysokości terenu w miejscu drzewa
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

        // Dodanie encji drzewa
        viewer.entities.add({
          name: `Maple Tree ${i + 1}`,
          position: treePosition,
          orientation: orientation,
          model: {
            uri: "models/maple_tree.glb",
            scale: 0.05, // Dostosuj skalę według potrzeb
            minimumPixelSize: 128,
            maximumScale: 20000,
          },
        });
      }

      // **Dodanie modelu czołgu**

      // Koordynaty czołgu (w pobliżu drzew)
      const tankLongitude = startLongitude + 3 * metersToDegreesLon;
      const tankLatitude = startLatitude - metersToDegreesLat * 2; // 20 metrów na południe

      // Pobranie wysokości terenu w miejscu czołgu
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
      const tankHeading = CesiumMath.toRadians(0);
      const tankPitch = 0;
      const tankRoll = 0;
      const tankHpr = new HeadingPitchRoll(tankHeading, tankPitch, tankRoll);
      const tankOrientation = Transforms.headingPitchRollQuaternion(
        tankPosition,
        tankHpr
      );

      // Dodanie encji czołgu
      viewer.entities.add({
        name: "Tank",
        position: tankPosition,
        orientation: tankOrientation,
        model: {
          uri: "models/tank.glb",
          scale: 1, // Dostosuj skalę według potrzeb
          minimumPixelSize: 128,
          maximumScale: 20000,
        },
      });

      // **Dodanie encji gracza**

      const initialLongitude = 18.299756;
      const initialLatitude = 54.324447;

      // Pobranie wysokości terenu w pozycji gracza
      const playerCartographicPosition = Cartographic.fromDegrees(
        initialLongitude,
        initialLatitude
      );
      const playerPositions = [playerCartographicPosition];
      const playerUpdatedPositions = await sampleTerrainMostDetailed(
        terrainProvider,
        playerPositions
      );
      const playerHeight = playerUpdatedPositions[0].height;

      const playerPosition = Cartesian3.fromDegrees(
        initialLongitude,
        initialLatitude,
        playerHeight
      );

      const playerEntity = viewer.entities.add({
        name: "Player",
        position: new ConstantPositionProperty(playerPosition),
        orientation: new ConstantProperty(
          Transforms.headingPitchRollQuaternion(
            playerPosition,
            new HeadingPitchRoll()
          )
        ),
        billboard: {
          image: "player.jpg", // Ścieżka do ikony gracza
          width: 32,
          height: 32,
        },
      });

      playerEntityRef.current = playerEntity;

      // **Symulacja ruchu gracza**

      const updatePlayerPosition = () => {
        const playerEntity = playerEntityRef.current;
        if (!playerEntity) {
          return;
        }

        const positionProperty = playerEntity.position;
        if (!positionProperty) {
          console.warn("playerEntity.position is undefined");
          return;
        }

        const currentPosition = positionProperty.getValue(JulianDate.now());
        if (!currentPosition) {
          console.warn("currentPosition is undefined");
          return;
        }

        const cartographic = Cartographic.fromCartesian(currentPosition);

        const deltaLongitude = (Math.random() - 0.5) * 0.0001;
        const deltaLatitude = (Math.random() - 0.5) * 0.0001;

        const newLongitude =
          CesiumMath.toDegrees(cartographic.longitude) + deltaLongitude;
        const newLatitude =
          CesiumMath.toDegrees(cartographic.latitude) + deltaLatitude;

        // Pobranie wysokości terenu w nowej pozycji
        const cartographicPosition = Cartographic.fromDegrees(
          newLongitude,
          newLatitude
        );

        sampleTerrainMostDetailed(terrainProvider, [cartographicPosition]).then(
          (updatedPositions) => {
            const newHeight = updatedPositions[0].height;

            const newPosition = Cartesian3.fromDegrees(
              newLongitude,
              newLatitude,
              newHeight
            );

            // Aktualizacja pozycji encji
            (playerEntity.position as ConstantPositionProperty).setValue(
              newPosition
            );

            // Opcjonalnie: Aktualizacja orientacji gracza
            const newHeading = CesiumMath.toRadians(Math.random() * 360); // Losowy heading
            const hpr = new HeadingPitchRoll(newHeading, 0, 0);
            playerEntity.orientation = new ConstantProperty(
              Transforms.headingPitchRollQuaternion(newPosition, hpr)
            );
          }
        );
      };

      const intervalId = setInterval(updatePlayerPosition, 1000);

      // Funkcja czyszcząca
      return () => {
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.destroy();
        }
        if (handlerRef.current) {
          handlerRef.current.destroy();
        }
        clearInterval(intervalId);
      };
    };

    // Inicjalizacja Cesium
    initializeCesium();
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <div
        id="cesiumContainer"
        ref={cesiumContainerRef}
        style={{ width: "100%", height: "100vh" }}
      />
      {/* Elementy interfejsu użytkownika pozostają bez zmian */}
    </div>
  );
};

export default CesiumMap;
