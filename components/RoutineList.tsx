import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import RoutineActions from "./RoutineActions";

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

interface RoutineListProps {
  routines: Routine[];
  onRoutinePress?: (routine: Routine) => void;
  onDeleteRoutine?: (routineId: string) => void;
  onEditRoutine?: (routine: Routine) => void;
}

export const RoutineList: React.FC<RoutineListProps> = ({
  routines,
  onRoutinePress,
  onDeleteRoutine,
  onEditRoutine,
}) => {
  const handleEditPress = (routine: Routine) => {
    if (onEditRoutine) {
      onEditRoutine(routine);
    }
  };
  const handleDeletePress = (routine: Routine) => {
    Alert.alert(
      "Delete Routine",
      `Are you sure you want to delete "${routine.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeleteRoutine?.(routine.id),
        },
      ],
    );
  };

  if (routines.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400 text-lg text-center">
          No routines yet.{"\n"}Create your first workout routine!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1">
      <Text className="text-white text-lg font-bold mb-4">My Routines</Text>
      {routines.map((routine) => (
        <View key={routine.id} className="bg-gray-800 p-4 rounded-lg mb-3">
          <TouchableOpacity
            onPress={() => onRoutinePress?.(routine)}
            className="flex-1"
          >
            <View className="flex-row justify-between items-start mb-3">
              <Text className="text-white font-semibold text-lg flex-1 pr-2">
                {routine.name}
              </Text>
              <RoutineActions
                routine={routine}
                onEdit={handleEditPress}
                onDelete={handleDeletePress}
              />
            </View>

            {/* Show first few exercises */}
            <View className="mb-3">
              <Text className="text-gray-400 text-sm">
                {routine.exercisesString}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => onRoutinePress?.(routine)}
              className="bg-blue-600 py-2.5 rounded-lg"
            >
              <Text className="text-white font-medium text-center text-base">
                Start Routine
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};
