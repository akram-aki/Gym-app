import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, BackHandler, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NewRoutineForm } from "./NewRoutineForm";
import { RoutineList } from "./RoutineList";
import { WorkoutSession } from "./WorkoutSession";
import { WorkoutHistory } from "./WorkoutHistory";

interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
}

interface Routine {
  id: string;
  name: string;
  exercisesString: string;
  exercises: Exercise[];
  createdAt: string;
}

type Screen = "home" | "form" | "workout" | "history";

export const Example = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);

  // Load routines from storage when component mounts
  useEffect(() => {
    loadRoutines();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (currentScreen === "home") {
        // If on home screen, show exit confirmation
        Alert.alert("Exit App", "Are you sure you want to exit?", [
          {
            text: "Cancel",
            onPress: () => null,
            style: "cancel",
          },
          {
            text: "Exit",
            onPress: () => BackHandler.exitApp(),
          },
        ]);
        return true; // Prevent default behavior
      } else if (currentScreen === "workout") {
        // If in workout, ask for confirmation before exiting
        Alert.alert(
          "Exit Workout",
          "Are you sure you want to exit? Your workout progress will be lost.",
          [
            {
              text: "Cancel",
              onPress: () => null,
              style: "cancel",
            },
            {
              text: "Exit",
              onPress: () => {
                setSelectedRoutine(null);
                setCurrentScreen("home");
              },
            },
          ],
        );
        return true; // Prevent default behavior
      } else {
        // For other screens (form, history), just go back to home
        setCurrentScreen("home");
        if (currentScreen === "form") {
          // Clear any form state if needed
        }
        return true; // Prevent default behavior
      }
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [currentScreen]);

  const loadRoutines = async () => {
    try {
      const storedRoutines = await AsyncStorage.getItem("workoutRoutines");
      if (storedRoutines) {
        setRoutines(JSON.parse(storedRoutines));
      }
    } catch (error) {
      console.error("Error loading routines:", error);
    }
  };

  const handleFormClose = () => {
    console.log("Form closing...");
    setCurrentScreen("home");
    setEditingRoutine(null);
  };

  const handleFormSave = () => {
    console.log("Form saved, reloading routines...");
    loadRoutines();
  };

  const handleRoutinePress = (routine: Routine) => {
    console.log("Routine pressed:", routine.name);
    setSelectedRoutine(routine);
    setCurrentScreen("workout");
  };

  const handleWorkoutClose = () => {
    setSelectedRoutine(null);
    setCurrentScreen("home");
  };

  const handleWorkoutSave = () => {
    console.log("Workout saved");
  };

  const handleRoutineEdit = (routine: Routine) => {
    console.log("Editing routine:", routine.name);
    setEditingRoutine(routine);
    setCurrentScreen("form");
  };

  const handleNewRoutinePress = () => {
    console.log("New Routine button pressed!");
    setEditingRoutine(null);
    setCurrentScreen("form");
  };

  const handleDeleteRoutine = async (routineId: string) => {
    try {
      // Get existing routines
      const storedRoutines = await AsyncStorage.getItem("workoutRoutines");
      if (storedRoutines) {
        const routines = JSON.parse(storedRoutines);
        // Filter out the routine to delete
        const updatedRoutines = routines.filter(
          (routine: Routine) => routine.id !== routineId,
        );
        // Save back to storage
        await AsyncStorage.setItem(
          "workoutRoutines",
          JSON.stringify(updatedRoutines),
        );
        // Reload routines to update the UI
        loadRoutines();
        console.log("Routine deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting routine:", error);
      Alert.alert("Error", "Failed to delete routine");
    }
  };

  console.log("Current screen:", currentScreen);

  // Render different screens based on current state
  const renderScreen = () => {
    switch (currentScreen) {
      case "form":
        return (
          <NewRoutineForm
            onClose={handleFormClose}
            onSave={handleFormSave}
            existingRoutine={editingRoutine ?? undefined}
          />
        );

      case "workout":
        if (selectedRoutine) {
          return (
            <WorkoutSession
              routine={selectedRoutine}
              onClose={handleWorkoutClose}
              onSave={handleWorkoutSave}
            />
          );
        }
        // If no routine selected, go back to home
        setCurrentScreen("home");
        return null;

      case "history":
        return (
          <WorkoutHistory
            setCurrentScreen={setCurrentScreen}
            currentScreen={currentScreen}
          />
        );

      case "home":
      default:
        return (
          <View className="flex-1 bg-gray-900 p-4">
            {/* Header with Add Button */}
            <View className="flex-row justify-between items-center mb-6 mt-8">
              <Text className="text-white text-2xl font-bold">
                Workout Tracker
              </Text>
              <TouchableOpacity
                onPress={handleNewRoutinePress}
                className="bg-blue-600 px-4 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold">New Routine</Text>
              </TouchableOpacity>
            </View>

            {/* Tab Navigation */}
            <View className="flex-row bg-gray-800 rounded-lg p-1 mb-4">
              <TouchableOpacity
                onPress={() => setCurrentScreen("home")}
                className={`flex-1 py-3 rounded-lg ${
                  (currentScreen as Screen) === "home"
                    ? "bg-blue-600"
                    : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    (currentScreen as Screen) === "home"
                      ? "text-white"
                      : "text-gray-400"
                  }`}
                >
                  Routines
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCurrentScreen("history")}
                className={`flex-1 py-3 rounded-lg ${
                  (currentScreen as Screen) === "history"
                    ? "bg-blue-600"
                    : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    (currentScreen as Screen) === "history"
                      ? "text-white"
                      : "text-gray-400"
                  }`}
                >
                  History
                </Text>
              </TouchableOpacity>
            </View>

            {/* Routine List */}
            <RoutineList
              routines={routines}
              onEditRoutine={handleRoutineEdit}
              onRoutinePress={handleRoutinePress}
              onDeleteRoutine={handleDeleteRoutine}
            />
          </View>
        );
    }
  };

  return renderScreen();
};
