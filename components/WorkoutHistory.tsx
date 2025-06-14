import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  BackHandler,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Screen = "home" | "form" | "workout" | "history";

interface WorkoutSet {
  setNumber: number;
  weight: string;
  reps: string;
  completed: boolean;
}

interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
  currentSet: number;
}

interface WorkoutHistoryItem {
  id: string;
  routineName: string;
  routineId: string;
  exercises: WorkoutExercise[];
  startTime: string;
  endTime: string;
  duration: number; // minutes
  completedSets: number;
  totalSets: number;
}

interface WorkoutHistoryProps {
  setCurrentScreen: React.Dispatch<React.SetStateAction<Screen>>;
  currentScreen: Screen;
}

export const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({
  setCurrentScreen,
  currentScreen,
}) => {
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [selectedWorkout, setSelectedWorkout] =
    useState<WorkoutHistoryItem | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (selectedWorkout) {
        // If viewing a specific workout, go back to history list
        setSelectedWorkout(null);
      } else {
        // If viewing history list, go back to main screen
        setCurrentScreen("home");
      }
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [selectedWorkout]);

  const loadHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem("workoutHistory");
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Error loading workout history:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " at " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const calculateTotalWeight = (workout: WorkoutHistoryItem) => {
    return workout.exercises.reduce((total, exercise) => {
      return (
        total +
        exercise.sets.reduce((exerciseTotal, set) => {
          if (set.completed && set.weight && set.reps) {
            return (
              exerciseTotal + parseFloat(set.weight) * parseFloat(set.reps)
            );
          }
          return exerciseTotal;
        }, 0)
      );
    }, 0);
  };

  if (selectedWorkout) {
    return (
      <View className="flex-1 bg-gray-900 p-4">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6 mt-8">
          <View>
            <Text className="text-white text-2xl font-bold">
              {selectedWorkout.routineName}
            </Text>
            <Text className="text-gray-400">
              {formatDate(selectedWorkout.startTime)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedWorkout(null)}
            className="bg-gray-700 px-4 py-2 rounded-lg"
          >
            <Text className="text-white">Back</Text>
          </TouchableOpacity>
        </View>

        {/* Workout Stats */}
        <View className="bg-gray-800 p-4 rounded-lg mb-4">
          <Text className="text-white text-lg font-bold mb-2">
            Workout Summary
          </Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-300">Duration:</Text>
            <Text className="text-white">
              {selectedWorkout.duration} minutes
            </Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-300">Sets Completed:</Text>
            <Text className="text-white">
              {selectedWorkout.completedSets}/{selectedWorkout.totalSets}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-300">Total Volume:</Text>
            <Text className="text-white">
              {calculateTotalWeight(selectedWorkout).toFixed(0)} lbs×reps
            </Text>
          </View>
        </View>

        {/* Exercise Details */}
        <ScrollView className="flex-1">
          {selectedWorkout.exercises.map((exercise, exerciseIndex) => (
            <View
              key={exerciseIndex}
              className="bg-gray-800 p-4 rounded-lg mb-3"
            >
              <Text className="text-white text-lg font-bold mb-3">
                {exercise.exerciseName}
              </Text>

              {exercise.sets.map((set, setIndex) => (
                <View
                  key={setIndex}
                  className={`flex-row justify-between items-center p-2 rounded mb-2 ${
                    set.completed ? "bg-green-700" : "bg-gray-700"
                  }`}
                >
                  <Text className="text-white">Set {set.setNumber}</Text>
                  {set.completed ? (
                    <Text className="text-white">
                      {set.weight} lbs × {set.reps} reps
                    </Text>
                  ) : (
                    <Text className="text-gray-400">Skipped</Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900 p-4">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6 mt-8">
        <Text className="text-white text-2xl font-bold">Workout History</Text>
      </View>

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

      <Text className="text-white text-xl font-bold mb-4">Your History</Text>


      {history.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400 text-lg text-center">
            No workout history yet.{"\n"}Complete your first workout to see it
            here!
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1">
          {history.map((workout) => (
            <TouchableOpacity
              key={workout.id}
              onPress={() => setSelectedWorkout(workout)}
              className="bg-gray-800 p-4 rounded-lg mb-3"
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white font-semibold text-lg">
                  {workout.routineName}
                </Text>
                <Text className="text-blue-400 text-sm">View Details →</Text>
              </View>

              <Text className="text-gray-400 text-sm mb-2">
                {formatDate(workout.startTime)}
              </Text>

              <View className="flex-row justify-between">
                <Text className="text-gray-300 text-sm">
                  {workout.duration} min • {workout.completedSets}/
                  {workout.totalSets} sets
                </Text>
                <Text className="text-green-400 text-sm">
                  {calculateTotalWeight(workout).toFixed(0)} lbs×reps
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};
