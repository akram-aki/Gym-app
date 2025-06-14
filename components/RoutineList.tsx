import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';

interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
}

interface Routine {
  id: string;
  name: string;
  exercises: Exercise[];
  createdAt: string;
}

interface RoutineListProps {
  routines: Routine[];
  onRoutinePress?: (routine: Routine) => void;
  onDeleteRoutine?: (routineId: string) => void;
}

export const RoutineList: React.FC<RoutineListProps> = ({ 
  routines, 
  onRoutinePress, 
  onDeleteRoutine 
}) => {
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
      ]
    );
  };

  if (routines.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400 text-lg text-center">
          No routines yet.{'\n'}Create your first workout routine!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1">
      <Text className="text-white text-xl font-bold mb-4">Your Routines</Text>
      {routines.map((routine) => (
        <View key={routine.id} className="bg-gray-800 p-4 rounded-lg mb-3">
          <TouchableOpacity
            onPress={() => onRoutinePress?.(routine)}
            className="flex-1"
          >
            <View className="flex-row justify-between items-start mb-2">
              <Text className="text-white font-semibold text-lg flex-1">{routine.name}</Text>
              <TouchableOpacity
                onPress={() => handleDeletePress(routine)}
                className="bg-red-600 px-3 py-1 rounded ml-3"
              >
                <Text className="text-white text-sm font-semibold">Delete</Text>
              </TouchableOpacity>
            </View>
            
            <Text className="text-gray-300 text-sm mb-2">
              {routine.exercises.length} exercise{routine.exercises.length !== 1 ? 's' : ''}
            </Text>
            
            {/* Show first few exercises */}
            <View className="flex-row flex-wrap gap-1">
              {routine.exercises.slice(0, 3).map((exercise, index) => (
                <Text key={exercise.id} className="text-blue-400 text-sm">
                  {exercise.name}
                  {index < Math.min(routine.exercises.length - 1, 2) ? ' • ' : ''}
                </Text>
              ))}
              {routine.exercises.length > 3 && (
                <Text className="text-gray-400 text-sm">
                  +{routine.exercises.length - 3} more
                </Text>
              )}
            </View>
            
            <Text className="text-gray-500 text-xs mt-2">
              Created {new Date(routine.createdAt).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}; 