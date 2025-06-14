import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface WorkoutSessionProps {
  routine: Routine;
  onClose: () => void;
  onSave: () => void;
}

export const WorkoutSession: React.FC<WorkoutSessionProps> = ({ routine, onClose, onSave }) => {
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [restTime, setRestTime] = useState(90); // Default 90 seconds
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [workoutStartTime] = useState(new Date());

  // Initialize workout exercises from routine
  useEffect(() => {
    const initExercises = routine.exercises.map(exercise => ({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      currentSet: 0,
      sets: Array.from({ length: exercise.sets || 3 }, (_, index) => ({
        setNumber: index + 1,
        weight: '',
        reps: (exercise.reps || 10).toString(),
        completed: false
      }))
    }));
    setWorkoutExercises(initExercises);
  }, [routine]);

  // Handle Android back button during workout
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        'Exit Workout',
        'Are you sure you want to exit? Your workout progress will be lost.',
        [
          {
            text: 'Cancel',
            onPress: () => null,
            style: 'cancel',
          },
          {
            text: 'Exit',
            onPress: onClose,
          },
        ]
      );
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [onClose]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            setTimerActive(false);
            Alert.alert('Rest Complete!', 'Time to start your next set!');
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    setWorkoutExercises(prev => prev.map((exercise, eIndex) => 
      eIndex === exerciseIndex 
        ? {
            ...exercise,
            sets: exercise.sets.map((set, sIndex) => 
              sIndex === setIndex ? { ...set, [field]: value } : set
            )
          }
        : exercise
    ));
  };

  const completeSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = workoutExercises[exerciseIndex];
    const set = exercise.sets[setIndex];
    
    if (!set.weight || !set.reps) {
      Alert.alert('Missing Data', 'Please enter weight and reps before completing the set');
      return;
    }

    setWorkoutExercises(prev => prev.map((exercise, eIndex) => 
      eIndex === exerciseIndex 
        ? {
            ...exercise,
            currentSet: Math.min(setIndex + 1, exercise.sets.length - 1),
            sets: exercise.sets.map((set, sIndex) => 
              sIndex === setIndex ? { ...set, completed: true } : set
            )
          }
        : exercise
    ));

    // Start rest timer
    setTimeRemaining(restTime);
    setTimerActive(true);
  };

  const saveWorkout = async () => {
    try {
      const completedSets = workoutExercises.flatMap(ex => 
        ex.sets.filter(set => set.completed)
      );

      if (completedSets.length === 0) {
        Alert.alert('No Sets Completed', 'Complete at least one set to save the workout');
        return;
      }

      const workout = {
        id: Date.now().toString(),
        routineName: routine.name,
        routineId: routine.id,
        exercises: workoutExercises,
        startTime: workoutStartTime.toISOString(),
        endTime: new Date().toISOString(),
        duration: Math.round((Date.now() - workoutStartTime.getTime()) / 1000 / 60), // minutes
        completedSets: completedSets.length,
        totalSets: workoutExercises.reduce((total, ex) => total + ex.sets.length, 0)
      };

      // Get existing workout history
      const existingHistory = await AsyncStorage.getItem('workoutHistory');
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      
      // Add new workout
      history.unshift(workout); // Add to beginning
      
      // Keep only last 100 workouts
      if (history.length > 100) {
        history.splice(100);
      }
      
      // Save back to storage
      await AsyncStorage.setItem('workoutHistory', JSON.stringify(history));
      
      Alert.alert('Workout Saved!', `Great job! You completed ${completedSets.length} sets.`);
      onSave();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
      console.error('Error saving workout:', error);
    }
  };

  const currentExercise = workoutExercises[currentExerciseIndex];

  if (!currentExercise) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center">
        <Text className="text-white">Loading workout...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900 p-4">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6 mt-8">
        <View>
          <Text className="text-white text-2xl font-bold">{routine.name}</Text>
          <Text className="text-gray-400">
            Exercise {currentExerciseIndex + 1} of {workoutExercises.length}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} className="bg-gray-700 px-4 py-2 rounded-lg">
          <Text className="text-white">Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Rest Timer */}
      {timerActive && (
        <View className="bg-orange-600 p-4 rounded-lg mb-4">
          <Text className="text-white text-center text-lg font-bold">
            Rest Time: {formatTime(timeRemaining)}
          </Text>
          <TouchableOpacity 
            onPress={() => setTimerActive(false)}
            className="bg-orange-700 px-3 py-1 rounded mt-2 self-center"
          >
            <Text className="text-white text-sm">Skip Rest</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Rest Time Setting */}
      <View className="bg-gray-800 p-3 rounded-lg mb-4">
        <Text className="text-white text-sm mb-2">Rest Time (seconds)</Text>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity 
            onPress={() => setRestTime(Math.max(30, restTime - 15))}
            className="bg-gray-700 px-3 py-2 rounded"
          >
            <Text className="text-white">-15</Text>
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold flex-1 text-center">
            {restTime}s
          </Text>
          <TouchableOpacity 
            onPress={() => setRestTime(restTime + 15)}
            className="bg-gray-700 px-3 py-2 rounded"
          >
            <Text className="text-white">+15</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Current Exercise */}
        <View className="bg-gray-800 p-4 rounded-lg mb-4">
          <Text className="text-white text-xl font-bold mb-4">{currentExercise.exerciseName}</Text>
          
          {currentExercise.sets.map((set, setIndex) => (
            <View key={setIndex} className={`p-3 rounded-lg mb-3 ${
              set.completed ? 'bg-green-700' : 
              setIndex === currentExercise.currentSet ? 'bg-blue-700' : 'bg-gray-700'
            }`}>
              <Text className="text-white font-semibold mb-2">
                Set {set.setNumber} {set.completed && '✓'}
              </Text>
              
              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className="text-gray-300 text-sm mb-1">Weight (lbs/kg)</Text>
                  <TextInput
                    className="bg-gray-600 text-white p-2 rounded text-center"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    value={set.weight}
                    onChangeText={(text) => updateSet(currentExerciseIndex, setIndex, 'weight', text)}
                    keyboardType="numeric"
                    editable={!set.completed}
                  />
                </View>
                
                <View className="flex-1">
                  <Text className="text-gray-300 text-sm mb-1">Reps</Text>
                  <TextInput
                    className="bg-gray-600 text-white p-2 rounded text-center"
                    value={set.reps}
                    onChangeText={(text) => updateSet(currentExerciseIndex, setIndex, 'reps', text)}
                    keyboardType="numeric"
                    editable={!set.completed}
                  />
                </View>
              </View>
              
              {!set.completed && (
                <TouchableOpacity
                  onPress={() => completeSet(currentExerciseIndex, setIndex)}
                  className="bg-green-600 py-2 rounded"
                >
                  <Text className="text-white font-semibold text-center">Complete Set</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Exercise Navigation */}
        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            onPress={() => setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))}
            disabled={currentExerciseIndex === 0}
            className={`flex-1 py-3 rounded-lg ${
              currentExerciseIndex === 0 ? 'bg-gray-700' : 'bg-blue-600'
            }`}
          >
            <Text className={`text-center font-semibold ${
              currentExerciseIndex === 0 ? 'text-gray-400' : 'text-white'
            }`}>
              Previous Exercise
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setCurrentExerciseIndex(Math.min(workoutExercises.length - 1, currentExerciseIndex + 1))}
            disabled={currentExerciseIndex === workoutExercises.length - 1}
            className={`flex-1 py-3 rounded-lg ${
              currentExerciseIndex === workoutExercises.length - 1 ? 'bg-gray-700' : 'bg-blue-600'
            }`}
          >
            <Text className={`text-center font-semibold ${
              currentExerciseIndex === workoutExercises.length - 1 ? 'text-gray-400' : 'text-white'
            }`}>
              Next Exercise
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Save Workout Button */}
      <TouchableOpacity
        onPress={saveWorkout}
        className="bg-green-600 py-4 rounded-lg mt-4"
      >
        <Text className="text-white font-semibold text-center text-lg">Finish Workout</Text>
      </TouchableOpacity>
    </View>
  );
}; 