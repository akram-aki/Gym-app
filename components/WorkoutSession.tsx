import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  BackHandler,
  AppState,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
// Optional: Set notification handler (if you want alerts in foreground)
Notifications.setNotificationHandler({
  handleNotification:
    async (): Promise<Notifications.NotificationBehavior> => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
});

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
  restTime: number; // Individual rest time for each exercise
}

interface WorkoutSessionProps {
  routine: Routine;
  onClose: () => void;
  onSave: () => void;
}

export const WorkoutSession: React.FC<WorkoutSessionProps> = ({
  routine,
  onClose,
  onSave,
}) => {
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>(
    [],
  );
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerEndTime, setTimerEndTime] = useState<Date | null>(null);
  const [workoutStartTime] = useState(new Date());
  // Add real-time tracking states
  const [currentDuration, setCurrentDuration] = useState(0);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);
  
  // Bottom sheet modal states
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [slideAnim] = useState(new Animated.Value(Dimensions.get('window').height));
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(0); // Track which exercise's timer is being edited
  
  // Use useRef to store scroll value without causing re-renders
  const selectedRestTimeRef = useRef<number>(90);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize workout exercises from routine
  useEffect(() => {
    const initializeWorkoutWithHistory = async () => {
      try {
        // Load workout history to get previous values
        const existingHistory = await AsyncStorage.getItem("workoutHistory");
        const history = existingHistory ? JSON.parse(existingHistory) : [];

        const initExercises = routine.exercises.map((exercise) => {
          // Find the most recent workout that contains this exercise
          let defaultWeight = "0";
          let defaultReps = (exercise.reps || 10).toString();

          for (const workout of history) {
            const previousExercise = workout.exercises.find(
              (ex: any) =>
                ex.exerciseName.toLowerCase() === exercise.name.toLowerCase(),
            );

            if (previousExercise) {
              // Find the last completed set to use as default
              const lastCompletedSet = previousExercise.sets
                .slice()
                .reverse()
                .find((set: any) => set.completed && set.weight && set.reps);

              if (lastCompletedSet) {
                defaultWeight = lastCompletedSet.weight;
                defaultReps = lastCompletedSet.reps;
                break; // Use the most recent workout data
              }
            }
          }

          return {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            currentSet: 0,
            restTime: 90, // Default 90 seconds for each exercise
            sets: Array.from({ length: exercise.sets || 3 }, (_, index) => ({
              setNumber: index + 1,
              weight: defaultWeight,
              reps: defaultReps,
              completed: false,
            })),
          };
        });

        setWorkoutExercises(initExercises);
      } catch (error) {
        console.error("Error loading previous workout data:", error);
        // Fallback to default initialization
        const initExercises = routine.exercises.map((exercise) => ({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          currentSet: 0,
          restTime: 90, // Default 90 seconds for each exercise
          sets: Array.from({ length: exercise.sets || 3 }, (_, index) => ({
            setNumber: index + 1,
            weight: "0",
            reps: (exercise.reps || 10).toString(),
            completed: false,
          })),
        }));
        setWorkoutExercises(initExercises);
      }
    };

    initializeWorkoutWithHistory();
  }, [routine]);

  // Handle Android back button during workout
  useEffect(() => {
    const backAction = () => {
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
            onPress: onClose,
          },
        ],
      );
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [onClose]);

  //sound permission

  useEffect(() => {
    const requestPermissions = async () => {
      if (Device.isDevice) {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          Alert.alert(
            "Permission required",
            "Notification permissions are required.",
          );
        }
      } else {
        console.warn("Must use physical device for notifications");
      }
    };

    requestPermissions();
  }, []);

  // AppState handler to sync timer when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active" && timerActive && timerEndTime) {
        // App became active, check if timer should still be running
        const now = new Date();
        const remaining = Math.max(
          0,
          Math.ceil((timerEndTime.getTime() - now.getTime()) / 1000),
        );

        if (remaining <= 0) {
          // Timer has ended while app was in background
          setTimerActive(false);
          setTimeRemaining(0);
          setTimerEndTime(null);

          // Play notification sound
          void Notifications.scheduleNotificationAsync({
            content: {
              title: "Rest Complete! 💪",
              body: "Time to start your next set!",
              sound: true,
            },
            trigger: null, // Fire immediately
          });

          Alert.alert("Rest Complete!", "Time to start your next set!");
        } else {
          // Update remaining time
          setTimeRemaining(remaining);
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [timerActive, timerEndTime]);

  // Improved timer effect using timestamps
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timerActive && timerEndTime) {
      interval = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(
          0,
          Math.ceil((timerEndTime.getTime() - now.getTime()) / 1000),
        );

        if (remaining <= 0) {
          setTimerActive(false);
          setTimeRemaining(0);
          setTimerEndTime(null);

          // Play notification sound
          void Notifications.scheduleNotificationAsync({
            content: {
              title: "Rest Complete! 💪",
              body: "Time to start your next set!",
              sound: true,
            },
            trigger: null, // Fire immediately
          });

          Alert.alert("Rest Complete!", "Time to start your next set!");
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [timerActive, timerEndTime]);

  // Real-time duration updater
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const durationInSeconds = Math.floor(
        (now.getTime() - workoutStartTime.getTime()) / 1000,
      );
      setCurrentDuration(durationInSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [workoutStartTime]);

  // Calculate volume and completed sets whenever workout exercises change
  useEffect(() => {
    let totalVolume = 0;
    let totalCompletedSets = 0;

    workoutExercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (set.completed && set.weight && set.reps) {
          totalVolume += parseFloat(set.weight) * parseFloat(set.reps);
          totalCompletedSets += 1;
        }
      });
    });

    setCurrentVolume(totalVolume);
    setCompletedSets(totalCompletedSets);
  }, [workoutExercises]);

  // Format duration to show minutes and seconds
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return ` ${mins}min ${secs.toString().padStart(2, "0")}s`;
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: "weight" | "reps",
    value: string,
  ) => {
    setWorkoutExercises((prev) =>
      prev.map((exercise, eIndex) =>
        eIndex === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, sIndex) =>
                sIndex === setIndex ? { ...set, [field]: value } : set,
              ),
            }
          : exercise,
      ),
    );
  };

  const completeSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = workoutExercises[exerciseIndex];
    const set = exercise.sets[setIndex];

    // If set is already completed, toggle it back to incomplete
    if (set.completed) {
      setWorkoutExercises((prev) =>
        prev.map((exercise, eIndex) =>
          eIndex === exerciseIndex
            ? {
                ...exercise,
                sets: exercise.sets.map((set, sIndex) =>
                  sIndex === setIndex ? { ...set, completed: false } : set,
                ),
              }
            : exercise,
        ),
      );
      return;
    }

    // If trying to complete, check for missing data
    if (!set.weight || !set.reps || set.weight === "0" || set.reps === "0") {
      Alert.alert(
        "Missing Data",
        "Please enter weight and reps before completing the set",
      );
      return;
    }

    setWorkoutExercises((prev) =>
      prev.map((exercise, eIndex) =>
        eIndex === exerciseIndex
          ? {
              ...exercise,
              currentSet: Math.min(setIndex + 1, exercise.sets.length - 1),
              sets: exercise.sets.map((set, sIndex) =>
                sIndex === setIndex ? { ...set, completed: true } : set,
              ),
            }
          : exercise,
      ),
    );

    // Start rest timer with timestamp-based approach
    const endTime = new Date(Date.now() + exercise.restTime * 1000);
    setTimerEndTime(endTime);
    setTimeRemaining(exercise.restTime);
    setTimerActive(true);
  };

  const addNewSet = (exerciseIndex: number) => {
    const exercise = workoutExercises[exerciseIndex];
    const lastSet = exercise.sets[exercise.sets.length - 1];

    // Use the last set's values as defaults for the new set
    const newSet: WorkoutSet = {
      setNumber: exercise.sets.length + 1,
      weight: lastSet?.weight || "0",
      reps: lastSet?.reps || "10",
      completed: false,
    };

    setWorkoutExercises((prev) =>
      prev.map((ex, index) =>
        index === exerciseIndex
          ? {
              ...ex,
              sets: [...ex.sets, newSet],
            }
          : ex,
      ),
    );
  };

  const saveWorkout = async () => {
    try {
      const completedSets = workoutExercises.flatMap((ex) =>
        ex.sets.filter((set) => set.completed),
      );

      if (completedSets.length === 0) {
        Alert.alert(
          "No Sets Completed",
          "Complete at least one set to save the workout",
        );
        return;
      }

      // Check if any exercises have more sets than originally planned
      const exercisesWithAddedSets = workoutExercises.filter((workoutEx) => {
        const originalExercise = routine.exercises.find(
          (routineEx) => routineEx.id === workoutEx.exerciseId,
        );
        return (
          originalExercise &&
          workoutEx.sets.length > (originalExercise.sets || 3)
        );
      });

      // If there are exercises with added sets, ask if user wants to update the routine
      if (exercisesWithAddedSets.length > 0) {
        const exerciseNames = exercisesWithAddedSets
          .map((ex) => ex.exerciseName)
          .join(", ");

        Alert.alert(
          "Update Routine?",
          `You added extra sets to: ${exerciseNames}.\n\nWould you like to save these changes to your routine permanently?`,
          [
            {
              text: "No, just this workout",
              onPress: () => saveWorkoutData(),
              style: "cancel",
            },
            {
              text: "Yes, update routine",
              onPress: () => saveWorkoutData(true),
            },
          ],
        );
      } else {
        saveWorkoutData();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save workout");
      console.error("Error saving workout:", error);
    }
  };

  const saveWorkoutData = async (updateRoutine = false) => {
    try {
      const completedSets = workoutExercises.flatMap((ex) =>
        ex.sets.filter((set) => set.completed),
      );

      const workout = {
        id: Date.now().toString(),
        routineName: routine.name,
        routineId: routine.id,
        exercises: workoutExercises,
        startTime: workoutStartTime.toISOString(),
        endTime: new Date().toISOString(),
        duration: Math.round(
          (Date.now() - workoutStartTime.getTime()) / 1000 / 60,
        ), // minutes
        completedSets: completedSets.length,
        totalSets: workoutExercises.reduce(
          (total, ex) => total + ex.sets.length,
          0,
        ),
      };

      // Save workout history
      const existingHistory = await AsyncStorage.getItem("workoutHistory");
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      history.unshift(workout);
      if (history.length > 100) {
        history.splice(100);
      }
      await AsyncStorage.setItem("workoutHistory", JSON.stringify(history));

      // Update routine if requested
      if (updateRoutine) {
        console.log("Updating routine with new sets...");
        const existingRoutines = await AsyncStorage.getItem("workoutRoutines");
        const routines = existingRoutines ? JSON.parse(existingRoutines) : [];

        console.log("Current routine ID:", routine.id);
        console.log(
          "Workout exercises with sets:",
          workoutExercises.map((ex) => ({
            name: ex.exerciseName,
            sets: ex.sets.length,
          })),
        );

        const updatedRoutines = routines.map((r: any) => {
          if (r.id === routine.id) {
            console.log("Found matching routine, updating exercises...");
            const updatedExercises = r.exercises.map((routineEx: any) => {
              // Match by name instead of ID to be more reliable
              const workoutEx = workoutExercises.find(
                (wEx) =>
                  wEx.exerciseName.toLowerCase() ===
                  routineEx.name.toLowerCase(),
              );

              if (workoutEx && workoutEx.sets.length > (routineEx.sets || 3)) {
                console.log(
                  `Updating ${routineEx.name}: ${routineEx.sets || 3} -> ${workoutEx.sets.length} sets`,
                );
                return { ...routineEx, sets: workoutEx.sets.length };
              }
              return routineEx;
            });

            // Update the exercisesString to reflect new set counts
            const exercisesString =
              updatedExercises.length > 3
                ? updatedExercises
                    .slice(0, 3)
                    .map((ex: any) => ex.name)
                    .join(", ") + "..."
                : updatedExercises.map((ex: any) => ex.name).join(", ");

            return { ...r, exercises: updatedExercises, exercisesString };
          }
          return r;
        });

        console.log("Saving updated routines...");
        await AsyncStorage.setItem(
          "workoutRoutines",
          JSON.stringify(updatedRoutines),
        );
        console.log("Routine update completed!");

        // Verify the update was saved correctly
        const verifyRoutines = await AsyncStorage.getItem("workoutRoutines");
        const verifyParsed = verifyRoutines ? JSON.parse(verifyRoutines) : [];
        const verifyRoutine = verifyParsed.find(
          (r: any) => r.id === routine.id,
        );
        if (verifyRoutine) {
          console.log(
            "Verification - Updated routine exercises:",
            verifyRoutine.exercises.map((ex: any) => ({
              name: ex.name,
              sets: ex.sets,
            })),
          );
        }
      }

      Alert.alert(
        "Workout Saved!",
        `Great job! You completed ${completedSets.length} sets.${
          updateRoutine ? "\n\nRoutine updated with new set counts!" : ""
        }`,
      );
      onSave();
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to save workout");
      console.error("Error saving workout:", error);
    }
  };

  const openTimerModal = (exerciseIndex: number) => {
    setCurrentExerciseIndex(exerciseIndex);
    selectedRestTimeRef.current = workoutExercises[exerciseIndex]?.restTime || 90; // Initialize ref value
    setShowTimerModal(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => {
      // Scroll to the correct position after modal animation completes
      const selectedIndex = timerOptions.findIndex(time => time === selectedRestTimeRef.current) || 4;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: selectedIndex * 48,
          animated: false
        });
      }, 100);
    });
  };

  const closeTimerModal = () => {
    // Save the ref value to the actual exercise
    const newExercises = [...workoutExercises];
    newExercises[currentExerciseIndex] = {
      ...newExercises[currentExerciseIndex],
      restTime: selectedRestTimeRef.current
    };
    setWorkoutExercises(newExercises);
    
    // Immediately hide the modal to prevent backdrop interaction
    setShowTimerModal(false);
    
    // Run the slide-out animation
    Animated.spring(slideAnim, {
      toValue: Dimensions.get('window').height,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
  };

  // Timer options for the picker
  const timerOptions = [
    30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300
  ];

  const getSelectedIndex = () => {
    return timerOptions.findIndex(time => time === selectedRestTimeRef.current) || 4; // Use ref value for picker position
  };

  if (workoutExercises.length === 0) {
    return (
      <View className="flex-1 bg-gray-900 items-center justify-center">
        <Text className="text-white">Loading workout...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 relative bg-gray-900 pb-14 ">
      {/* Header */}
      <View className="flex-row bg-gray pb-6 border-b border-gray-400 justify-between items-center   mt-14">
        <View className="ml-6">
          <Text className="text-white text-2xl font-bold">{routine.name}</Text>
        </View>

        <TouchableOpacity
          onPress={saveWorkout}
          className="bg-blue-600 mr-6 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-semibold">Finish </Text>
        </TouchableOpacity>
      </View>

      {/* Rest Timer */}
      {timerActive && (
        <View className="bg-orange-600 p-4 rounded-lg mb-4">
          <Text className="text-white text-center text-lg font-bold">
            Rest Time: {formatTime(timeRemaining)}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setTimerActive(false);
              setTimeRemaining(0);
              setTimerEndTime(null);
            }}
            className="bg-orange-700 px-3 py-1 rounded mt-2 self-center"
          >
            <Text className="text-white text-sm">Skip Rest</Text>
          </TouchableOpacity>
        </View>
      )}

      {/*the top thingy */}
      <View className="flex-row justify-around pb-2 border-b border-gray-500 mt-2">
        <View className="grid">
          <Text className="text-gray-300 text-sm">Duration</Text>
          <Text className="text-white text-lg">
            {formatDuration(currentDuration)}
          </Text>
        </View>
        <View className="grid">
          <Text className="text-gray-300 text-sm">Volume</Text>
          <Text className="text-white text-lg">{currentVolume.toFixed(2)}</Text>
        </View>
        <View className="grid">
          <Text className="text-gray-300 text-sm">Sets</Text>
          <Text className="text-white text-lg">{completedSets}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 relative ">
        {workoutExercises.map((exercise, exerciseIndex) => (
          <View key={exercise.exerciseId} className="pt-4 rounded-lg mb-4">
            <Text className="text-white text-xl ml-6 font-bold mb-8">
              {exercise.exerciseName}
            </Text>

            {/* Rest Timer Controls */}
            <View className="p-3">
              <TouchableOpacity
                onPress={() => openTimerModal(exerciseIndex)}
                className="items-center"
              >
                <Text className="text-blue-500 text-xl font-medium mb-2">
                  Rest Timer: {formatTime(exercise.restTime)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Header Row */}
            <View className="flex-row items-center mb-2 px-2">
              <View className="w-12">
                <Text className="text-white font-semibold text-center">
                  SET
                </Text>
              </View>
              <View className="flex-1 mx-4">
                <Text className="text-white font-semibold text-center">KG</Text>
              </View>
              <View className="flex-1 mx-4">
                <Text className="text-white font-semibold text-center">
                  REPS
                </Text>
              </View>
              <View className="w-14">
                <Text className="text-white font-semibold text-center">
                  DONE
                </Text>
              </View>
            </View>

            {/* Sets */}
            {exercise.sets.map((set, setIndex) => (
              <View
                key={setIndex}
                className={`flex-row items-center p-2  ${
                  set.completed
                    ? "bg-green-700 border-b border-gray-300 "
                    : setIndex % 2 === 0
                      ? "bg-gray-900"
                      : "bg-slate-800"
                }`}
              >
                {/* Set Number */}
                <View className="w-12">
                  <Text className="text-white text-lg font-extrabold text-center">
                    {set.setNumber}
                  </Text>
                </View>

                {/* Weight Input */}
                <View className="flex-1 mx-4">
                  <TextInput
                    className=" text-white text-lg p-2 rounded text-center"
                    placeholderTextColor="#9CA3AF"
                    value={set.weight}
                    onChangeText={(text) =>
                      updateSet(exerciseIndex, setIndex, "weight", text)
                    }
                    onFocus={() => {
                      if (set.weight === "0") {
                        updateSet(exerciseIndex, setIndex, "weight", "");
                      }
                    }}
                    keyboardType="numeric"
                    editable={!set.completed}
                  />
                </View>

                {/* Reps Input */}
                <View className="flex-1 mx-4">
                  <TextInput
                    className="text-white text-lg p-2 rounded text-center"
                    value={set.reps}
                    onChangeText={(text) =>
                      updateSet(exerciseIndex, setIndex, "reps", text)
                    }
                    onFocus={() => {
                      // Clear default values when user first clicks
                      if (set.reps === "10" || set.reps === "0") {
                        updateSet(exerciseIndex, setIndex, "reps", "");
                      }
                    }}
                    keyboardType="numeric"
                    editable={!set.completed}
                  />
                </View>

                {/* Complete Button */}
                <View className="w-14">
                  <TouchableOpacity
                    onPress={() => completeSet(exerciseIndex, setIndex)}
                    className={`py-2 px-1 rounded ${
                      set.completed ? "bg-green-600" : "bg-gray-600"
                    }`}
                  >
                    <Text className="text-white text-center font-bold">
                      {"✓"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add New Set Button */}
            <TouchableOpacity
              onPress={() => addNewSet(exerciseIndex)}
              className="bg-blue-600 mx-4 mt-2 py-2 px-4 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">
                + Add New Set
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Sheet Timer Modal */}
      {showTimerModal && (
        <Modal
          transparent={true}
          visible={true}
          onRequestClose={closeTimerModal}
          animationType="none"
          statusBarTranslucent={true}
        >
          <Animated.View 
            className="flex-1 bg-black/50 justify-end"
            style={{
              opacity: slideAnim.interpolate({
                inputRange: [0, Dimensions.get('window').height],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            }}
          >
            <TouchableOpacity 
              className="flex-1" 
              onPress={closeTimerModal}
              activeOpacity={1}
            />
            
            <Animated.View 
              style={{
                transform: [{ translateY: slideAnim }],
              }}
              className="bg-gray-800 rounded-t-3xl p-6 min-h-80"
            >
              {/* Handle bar */}
              <View className="w-12 h-1 bg-gray-600 rounded-full self-center mb-6" />
              
              {/* Title */}
              <Text className="text-white text-2xl font-bold text-center mb-8">
                Set Rest Timer
              </Text>
              
              
              {/* Vertical Timer Picker */}
              <View className="mb-8">
                <Text className="text-gray-400 text-sm text-center mb-6">
                  Scroll to select rest time
                </Text>
                
                <View className="h-48 relative">
                  {/* Selection indicator */}
                  <View 
                    className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-12 bg-blue-600/20 border-2 border-blue-500 rounded-xl" 
                    pointerEvents="none"
                  />
                  
                  <ScrollView 
                    ref={scrollViewRef}
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    snapToInterval={48} // Height of each item
                    decelerationRate="fast"
                    bounces={false}
                    contentContainerStyle={{
                      paddingVertical: 96, // Half of container height for centering
                    }}
                    onMomentumScrollEnd={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const index = Math.round(offsetY / 48);
                      const selectedTime = timerOptions[index];
                      if (selectedTime) {
                        selectedRestTimeRef.current = selectedTime; // Just update ref, no state changes
                      }
                    }}
                    onScroll={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      const maxOffset = (timerOptions.length - 1) * 48;
                      
                      // Just update ref value, no state changes for maximum performance
                      const index = Math.round(offsetY / 48);
                      const selectedTime = timerOptions[index];
                      if (selectedTime) {
                        selectedRestTimeRef.current = selectedTime;
                      }
                      
                      // Haptic feedback when hitting boundaries (only once per boundary hit)
                      if ((offsetY < -10 || offsetY > maxOffset + 10) && !hasTriggeredHaptic) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setHasTriggeredHaptic(true);
                      } else if (offsetY >= 0 && offsetY <= maxOffset) {
                        setHasTriggeredHaptic(false);
                      }
                    }}
                    scrollEventThrottle={16}
                  >
                    {timerOptions.map((seconds, index) => (
                      <TouchableOpacity
                        key={seconds}
                        onPress={() => {
                          selectedRestTimeRef.current = seconds; // Just update ref, no state changes
                        }}
                        className="h-12 justify-center items-center"
                      >
                        <Text 
                          className={`text-2xl font-semibold ${
                            selectedRestTimeRef.current === seconds 
                              ? 'text-blue-400' 
                              : 'text-gray-400'
                          }`}
                        >
                          {formatTime(seconds)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              
              {/* Done button */}
              <TouchableOpacity
                onPress={closeTimerModal}
                className="bg-blue-600 py-4 rounded-xl"
              >
                <Text className="text-white text-center text-lg font-semibold">
                  Done
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </View>
  );
};
