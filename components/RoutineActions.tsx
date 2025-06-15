import React, { useState } from "react";
import { TouchableOpacity, Text, View } from "react-native";

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



interface WorkoutSessionProps {
  routine: Routine;
  onEdit: (routine: Routine) => void;
  onDelete: (routine: Routine) => void;
}

const RoutineActions :React.FC<WorkoutSessionProps>= ({ routine, onEdit, onDelete }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  return (
    <View className="relative">
      <TouchableOpacity
        onPress={toggleMenu}
        className="bg-gray-700 px-3 py-1 rounded"
      >
        <Text className="text-white text-lg font-bold">...</Text>
      </TouchableOpacity>

      {menuVisible && (
        <View className="absolute  right-0 w-28 overflow-hidden mt-12 rounded-2xl bg-gray-700 p-4 shadow-2xl z-10">
        <View className="flex-col gap-2 justify-between items-center">

          <TouchableOpacity
            onPress={() => {
              setMenuVisible(false);
              onEdit(routine);
            }}
            className="w-full bg-blue-100 rounded-xl p-2"
          >
            <Text className="text-black text-center ">Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setMenuVisible(false);
              onDelete(routine);
            }}
            className="w-full bg-blue-100 rounded-xl p-2"
          >
            <Text className="text-black text-center ">Delete</Text>
          </TouchableOpacity>
        </View>
        </View>
      )}
    </View>
  );
};

export default RoutineActions;
