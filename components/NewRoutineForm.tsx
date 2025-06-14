import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  BackHandler,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
}

interface NewRoutineFormProps {
  onClose: () => void;
  onSave: () => void;
}

type MuscleGroup =
  | "chest"
  | "triceps"
  | "shoulders"
  | "back"
  | "biceps"
  | "forearms"
  | "abs"
  | "quads"
  | "hamstrings"
  | "calves";

type ExercisesMap = Record<MuscleGroup, string[]>;

const EXERCISES: ExercisesMap = {
  chest: [
    "Bench Press",
    "Incline Bench Press",
    "Decline Bench Press",
    "Push-ups",
    "Chest Flyes",
    "Cable Crossovers",
    "Dips",
    "Incline Dumbbell Press",
    "Svend Press",
    "Machine Chest Press",
  ],

  triceps: [
    "Tricep Dips",
    "Close-Grip Bench Press",
    "Overhead Tricep Extension",
    "Tricep Pushdowns",
    "Skull Crushers",
    "Diamond Push-ups",
    "Cable Kickbacks",
    "Dumbbell Kickbacks",
    "Reverse Grip Pushdowns",
    "Bodyweight Dips",
  ],

  shoulders: [
    "Overhead Press",
    "Dumbbell Shoulder Press",
    "Arnold Press",
    "Lateral Raises",
    "Front Raises",
    "Rear Delt Flyes",
    "Barbell Overhead Press",
    "Cable Lateral Raises",
    "Face Pulls",
    "Push Press",
  ],

  back: [
    "Deadlifts",
    "Pull-ups",
    "Barbell Rows",
    "T-Bar Rows",
    "Lat Pulldowns",
    "Seated Cable Rows",
    "Chin-ups",
    "Single-arm Dumbbell Rows",
    "Trap Bar Deadlifts",
    "Face Pulls",
  ],

  biceps: [
    "Barbell Curls",
    "Dumbbell Curls",
    "Hammer Curls",
    "Concentration Curls",
    "Preacher Curls",
    "Cable Curls",
    "Incline Dumbbell Curls",
    "EZ Bar Curls",
    "Zottman Curls",
    "Reverse Curls",
  ],

  forearms: [
    "Wrist Curls",
    "Reverse Wrist Curls",
    "Farmer's Carries",
    "Hammer Curls",
    "Dead Hangs",
    "Plate Pinches",
    "Towel Pull-ups",
    "Wrist Roller",
    "Barbell Holds",
    "Finger Curls",
  ],

  abs: [
    "Crunches",
    "Leg Raises",
    "Planks",
    "Russian Twists",
    "Bicycle Crunches",
    "Mountain Climbers",
    "V-ups",
    "Hanging Leg Raises",
    "Flutter Kicks",
    "Cable Crunches",
  ],

  quads: [
    "Squats",
    "Front Squats",
    "Leg Press",
    "Lunges",
    "Step-ups",
    "Bulgarian Split Squats",
    "Wall Sits",
    "Hack Squats",
    "Sissy Squats",
    "Goblet Squats",
  ],

  hamstrings: [
    "Romanian Deadlifts",
    "Glute Ham Raises",
    "Hamstring Curls",
    "Good Mornings",
    "Stiff-leg Deadlifts",
    "Single-leg Deadlifts",
    "Cable Kickbacks",
    "Kettlebell Swings",
    "Bridge Walkouts",
    "Sliding Leg Curls",
  ],

  calves: [
    "Standing Calf Raises",
    "Seated Calf Raises",
    "Donkey Calf Raises",
    "Single-leg Calf Raises",
    "Farmer's Walk on Toes",
    "Jump Rope",
    "Calf Press on Leg Machine",
    "Tiptoe Walks",
    "Explosive Calf Raises",
    "Smith Machine Calf Raises",
  ],
};


export const NewRoutineForm: React.FC<NewRoutineFormProps> = ({
  onClose,
  onSave,
}) => {
  const [routineName, setRoutineName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter exercises based on search term
  const getFilteredExercises = () => {
    if (!searchTerm.trim()) {
      return EXERCISES;
    }

    const filtered: ExercisesMap = {} as ExercisesMap;
    const searchLower = searchTerm.toLowerCase();

    Object.entries(EXERCISES).forEach(([group, exercises]) => {
      const matchingExercises = exercises.filter(exercise =>
        exercise.toLowerCase().includes(searchLower)
      );
      if (matchingExercises.length > 0) {
        filtered[group as MuscleGroup] = matchingExercises;
      }
    });

    return filtered;
  };

  const filteredExercises = getFilteredExercises();

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      const hasUnsavedChanges =
        routineName.trim() !== "" || selectedExercises.length > 0;

      if (hasUnsavedChanges) {
        Alert.alert(
          "Discard Changes",
          "You have unsaved changes. Are you sure you want to go back?",
          [
            {
              text: "Cancel",
              onPress: () => null,
              style: "cancel",
            },
            {
              text: "Discard",
              onPress: () => {
                setSearchTerm("");
                onClose();
              },
            },
          ],
        );
      } else {
        setSearchTerm("");
        onClose();
      }
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [routineName, selectedExercises, onClose]);

  const addExercise = (exerciseName: string) => {
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: exerciseName,
      sets: 3,
      reps: 10,
    };
    setSelectedExercises([...selectedExercises, newExercise]);
  };

  const removeExercise = (id: string) => {
    setSelectedExercises(selectedExercises.filter((ex) => ex.id !== id));
  };

  const updateExercise = (
    id: string,
    field: "sets" | "reps",
    value: number,
  ) => {
    setSelectedExercises(
      selectedExercises.map((ex) =>
        ex.id === id ? { ...ex, [field]: value } : ex,
      ),
    );
  };

  const saveRoutine = async () => {
    if (!routineName.trim()) {
      Alert.alert("Error", "Please enter a routine name");
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert("Error", "Please select at least one exercise");
      return;
    }

    try {
      const routine = {
        id: Date.now().toString(),
        name: routineName,
        exercises: selectedExercises,
        createdAt: new Date().toISOString(),
      };

      // Get existing routines
      const existingRoutines = await AsyncStorage.getItem("workoutRoutines");
      const routines = existingRoutines ? JSON.parse(existingRoutines) : [];

      // Add new routine
      routines.push(routine);

      // Save back to storage
      await AsyncStorage.setItem("workoutRoutines", JSON.stringify(routines));

      Alert.alert("Success", "Routine saved successfully!");
      onSave();
      setSearchTerm("");
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to save routine");
      console.error("Error saving routine:", error);
    }
  };

  return (
    <View className="flex-1 bg-gray-900 p-4">
      <View className="flex-row justify-between items-center mb-6 mt-8">
        <Text className="text-white text-2xl font-bold">New Routine</Text>
        <TouchableOpacity
          onPress={() => {
            setSearchTerm("");
            onClose();
          }}
          className="bg-gray-700 px-4 py-2 rounded-lg"
        >
          <Text className="text-white">Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Routine Name Input */}
        <View className="mb-6">
          <Text className="text-white text-lg font-semibold mb-2">
            Routine Name
          </Text>
          <TextInput
            className="bg-gray-800 text-white p-3 rounded-lg"
            placeholder="Enter routine name"
            placeholderTextColor="#9CA3AF"
            value={routineName}
            onChangeText={setRoutineName}
          />
        </View>


        {/* Exercise Selection */}
        {Object.keys(filteredExercises).length === 0 && searchTerm.trim() ? (
          <View className="mb-6 p-4 bg-gray-800 rounded-lg">
            <Text className="text-gray-400 text-center">
              No exercises found for "{searchTerm}"
            </Text>
            <TouchableOpacity
              onPress={() => setSearchTerm("")}
              className="mt-2"
            >
              <Text className="text-blue-400 text-center">Clear search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.entries(filteredExercises).map(([group, exercises]) => (
            <View className="mb-5" key={group}>
              <Text className="text-white text-xl font-bold mb-4">
                {group.toUpperCase()}
                {searchTerm.trim() && (
                  <Text className="text-gray-400 text-sm font-normal">
                    {" "}({exercises.length} found)
                  </Text>
                )}
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {exercises.map((exo) => (
                  <TouchableOpacity
                    key={exo}
                    onPress={() => addExercise(exo)}
                    className="bg-blue-600 px-3 py-2 rounded-lg"
                  >
                    <Text className="text-white text-sm">{exo}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}

        {/* Selected Exercises */}
        {selectedExercises.length > 0 && (
          <View className="mb-6 ">
            <Text className="text-white text-lg font-semibold mb-3">
              Your Exercises
            </Text>
            {selectedExercises.map((exercise) => (
              <View
                key={exercise.id}
                className="bg-gray-800 p-4 rounded-lg mb-3"
              >
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-white font-semibold">
                    {exercise.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeExercise(exercise.id)}
                    className="bg-red-600 px-2 py-1 rounded"
                  >
                    <Text className="text-white text-xs">Remove</Text>
                  </TouchableOpacity>
                </View>

                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="text-gray-300 text-sm mb-1">Sets</Text>
                    <TextInput
                      className="bg-gray-700 text-white p-2 rounded text-center"
                      value={exercise.sets?.toString()}
                      onChangeText={(text) =>
                        updateExercise(exercise.id, "sets", parseInt(text) || 0)
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-gray-300 text-sm mb-1">Reps</Text>
                    <TextInput
                      className="bg-gray-700 text-white p-2 rounded text-center"
                      value={exercise.reps?.toString()}
                      onChangeText={(text) =>
                        updateExercise(exercise.id, "reps", parseInt(text) || 0)
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

        {/* Search Input */}
        <View className="mb-6">
          <Text className="text-white text-lg font-semibold mb-2">
            Search Exercises
          </Text>
          <TextInput
            className="bg-gray-800 text-white p-3 rounded-lg"
            placeholder="Search for exercises..."
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.trim() && (
            <TouchableOpacity
              onPress={() => setSearchTerm("")}
              className="absolute right-3 top-11"
            >
              <Text className="text-gray-400 text-lg">✕</Text>
            </TouchableOpacity>
          )}
        </View>

      {/* Save Button */}
      <TouchableOpacity
        onPress={saveRoutine}
        className="bg-green-600 py-4 rounded-lg mb-10 "
      >
        <Text className="text-white font-semibold text-center text-lg">
          Save Routine
        </Text>
      </TouchableOpacity>
    </View>
  );
};
