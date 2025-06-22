import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Heatmap from "./Heatmap";

type Screen = "home" | "form" | "workout" | "history";
type HistoryView = "details" | "progress";
type WorkoutData = {
  date: string;
  count: number;
};

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
  const [historyView, setHistoryView] = useState<HistoryView>("details");

  useEffect(() => {
    loadHistory();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (selectedWorkout) {
        // If viewing a specific workout, go back to history list
        setSelectedWorkout(null);
        setHistoryView("details");
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

  const getVolumeProgressData = () => {
    if (!selectedWorkout) return null;

    // Filter workouts for the same routine
    const routineWorkouts = history
      .filter((workout) => workout.routineName === selectedWorkout.routineName)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )
      .slice(-10); // Show last 10 workouts
    const WorkoutData: WorkoutData[] = [];
    routineWorkouts.map((item) => {
      const data = item.endTime.slice(0, 10);
      WorkoutData.push({ date: data, count: 1 });
    });
    return WorkoutData;
  };

  const renderProgressView = () => {
    const progressData = getVolumeProgressData();
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    let enddate: string | Date = new Date(currentYear, currentMonth + 1, 1);
    enddate = JSON.stringify(enddate).slice(1, 11);

    if (!progressData) {
      return (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400 text-lg text-center">
            Not enough data to show progress.{"\n"}Complete at least 2 workouts
            of this routine to see progress.
          </Text>
        </View>
      );
    }

    const screenWidth = Dimensions.get("window").width;

    return (
      <ScrollView className="flex-1">
        <View className="bg-gray-800  rounded-lg mb-4">
          <Text className="text-white pl-4 pt-4 text-lg font-bold mb-2">
            Volume Progress
          </Text>
          <Text className="text-gray-400 pl-4 text-sm mb-4">
            Workout consistency across your last 3 months
          </Text>
          {/* //<Heatmap history={history} />  */}

         {history && <Heatmap history={history} emptyColor="rgb(127, 127, 127)" filledColor="rgb(37, 99, 235)"  />}
        </View>

        {/* Volume Statistics */}
        <View className="bg-gray-800 p-4 rounded-lg mb-4">
          <Text className="text-white text-lg font-bold mb-3">
            Volume Statistics
          </Text>

          {(() => {
            if (!selectedWorkout) return null;

            const routineWorkouts = history
              .filter(
                (workout) =>
                  workout.routineName === selectedWorkout.routineName,
              )
              .sort(
                (a, b) =>
                  new Date(a.startTime).getTime() -
                  new Date(b.startTime).getTime(),
              );

            if (routineWorkouts.length === 0) return null;

            const volumes = routineWorkouts.map((workout) =>
              calculateTotalWeight(workout),
            );
            const latest = volumes[volumes.length - 1];
            const previous =
              volumes.length > 1 ? volumes[volumes.length - 2] : null;
            const highest = Math.max(...volumes);
            const lowest = Math.min(...volumes);
            const average =
              volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
            const change = previous
              ? ((latest - previous) / previous) * 100
              : 0;

            return (
              <>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-300">Latest Volume:</Text>
                  <Text className="text-white">
                    {latest.toFixed(0)} lbs×reps
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-300">Previous Volume:</Text>
                  <Text className="text-white">
                    {previous ? previous.toFixed(0) : "N/A"} lbs×reps
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-300">Change:</Text>
                  <Text
                    className={`${change >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(1)}%
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-300">Personal Best:</Text>
                  <Text className="text-green-400">
                    {highest.toFixed(0)} lbs×reps
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-300">Lowest Volume:</Text>
                  <Text className="text-red-400">
                    {lowest.toFixed(0)} lbs×reps
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-300">Average:</Text>
                  <Text className="text-white">
                    {average.toFixed(0)} lbs×reps
                  </Text>
                </View>
              </>
            );
          })()}
        </View>

        {/* Workout Frequency */}
        <View className="bg-gray-800 p-4 rounded-lg mb-4">
          <Text className="text-white text-lg font-bold mb-3">
            Workout Frequency
          </Text>

          {(() => {
            if (!selectedWorkout) return null;

            const routineWorkouts = history
              .filter(
                (workout) =>
                  workout.routineName === selectedWorkout.routineName,
              )
              .sort(
                (a, b) =>
                  new Date(a.startTime).getTime() -
                  new Date(b.startTime).getTime(),
              );

            if (routineWorkouts.length === 0) return null;

            const totalWorkouts = routineWorkouts.length;
            const firstWorkout = new Date(routineWorkouts[0].startTime);
            const lastWorkout = new Date(
              routineWorkouts[routineWorkouts.length - 1].startTime,
            );
            const daysBetween =
              Math.ceil(
                (lastWorkout.getTime() - firstWorkout.getTime()) /
                  (1000 * 60 * 60 * 24),
              ) || 1;
            const workoutsPerWeek = (totalWorkouts / daysBetween) * 7;

            // Calculate streak
            const today = new Date();
            const last30Days = routineWorkouts.filter((workout) => {
              const workoutDate = new Date(workout.startTime);
              const daysAgo =
                (today.getTime() - workoutDate.getTime()) /
                (1000 * 60 * 60 * 24);
              return daysAgo <= 30;
            });

            return (
              <>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-300">Total Workouts:</Text>
                  <Text className="text-white">{totalWorkouts}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-300">Workouts/Week:</Text>
                  <Text className="text-white">
                    {workoutsPerWeek.toFixed(1)}
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-300">Last 30 Days:</Text>
                  <Text className="text-blue-400">
                    {last30Days.length} workouts
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-300">First Workout:</Text>
                  <Text className="text-white">
                    {firstWorkout.toLocaleDateString()}
                  </Text>
                </View>
              </>
            );
          })()}
        </View>

        {/* Performance Trends */}
        <View className="bg-gray-800 p-4 rounded-lg mb-4">
          <Text className="text-white text-lg font-bold mb-3">
            Performance Trends
          </Text>

          {(() => {
            if (!selectedWorkout) return null;

            const routineWorkouts = history
              .filter(
                (workout) =>
                  workout.routineName === selectedWorkout.routineName,
              )
              .sort(
                (a, b) =>
                  new Date(a.startTime).getTime() -
                  new Date(b.startTime).getTime(),
              );

            if (routineWorkouts.length < 3) {
              return (
                <Text className="text-gray-400 text-center">
                  Complete more workouts to see trends
                </Text>
              );
            }

            const volumes = routineWorkouts.map((workout) =>
              calculateTotalWeight(workout),
            );
            const recent5 = volumes.slice(-5);
            const previous5 = volumes.slice(-10, -5);

            const recentAvg =
              recent5.reduce((sum, vol) => sum + vol, 0) / recent5.length;
            const previousAvg =
              previous5.length > 0
                ? previous5.reduce((sum, vol) => sum + vol, 0) /
                  previous5.length
                : recentAvg;
            const trend = ((recentAvg - previousAvg) / previousAvg) * 100;

            const avgDuration =
              routineWorkouts.reduce(
                (sum, workout) => sum + workout.duration,
                0,
              ) / routineWorkouts.length;
            const completionRate =
              (routineWorkouts.reduce(
                (sum, workout) =>
                  sum + workout.completedSets / workout.totalSets,
                0,
              ) /
                routineWorkouts.length) *
              100;

            return (
              <>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-300">Recent Trend:</Text>
                  <Text
                    className={`${trend >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {trend >= 0 ? "↗" : "↘"} {Math.abs(trend).toFixed(1)}%
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-300">Avg Duration:</Text>
                  <Text className="text-white">
                    {avgDuration.toFixed(0)} min
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-300">Completion Rate:</Text>
                  <Text className="text-blue-400">
                    {completionRate.toFixed(0)}%
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-300">Consistency:</Text>
                  <Text
                    className={`${completionRate >= 90 ? "text-green-400" : completionRate >= 70 ? "text-yellow-400" : "text-red-400"}`}
                  >
                    {completionRate >= 90
                      ? "Excellent"
                      : completionRate >= 70
                        ? "Good"
                        : "Needs Work"}
                  </Text>
                </View>
              </>
            );
          })()}
        </View>

        {/* Goals & Achievements */}
        <View className="bg-gray-800 p-4 rounded-lg mb-4">
          <Text className="text-white text-lg font-bold mb-3">
            Achievements
          </Text>

          {(() => {
            if (!selectedWorkout) return null;

            const routineWorkouts = history.filter(
              (workout) => workout.routineName === selectedWorkout.routineName,
            );

            const totalWorkouts = routineWorkouts.length;
            const volumes = routineWorkouts.map((workout) =>
              calculateTotalWeight(workout),
            );
            const personalBest = Math.max(...volumes);
            const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);

            return (
              <>
                <View className="flex-row items-center mb-3">
                  <Text className="text-2xl mr-3">🏆</Text>
                  <View className="flex-1">
                    <Text className="text-white font-semibold">
                      Personal Best
                    </Text>
                    <Text className="text-gray-400">
                      {personalBest.toFixed(0)} lbs×reps
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center mb-3">
                  <Text className="text-2xl mr-3">💪</Text>
                  <View className="flex-1">
                    <Text className="text-white font-semibold">
                      Total Volume Lifted
                    </Text>
                    <Text className="text-gray-400">
                      {(totalVolume / 1000).toFixed(1)}K lbs×reps
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center mb-3">
                  <Text className="text-2xl mr-3">🔥</Text>
                  <View className="flex-1">
                    <Text className="text-white font-semibold">
                      Workout Streak
                    </Text>
                    <Text className="text-gray-400">
                      {totalWorkouts} {selectedWorkout.routineName} sessions
                    </Text>
                  </View>
                </View>

                {totalWorkouts >= 10 && (
                  <View className="flex-row items-center">
                    <Text className="text-2xl mr-3">⭐</Text>
                    <View className="flex-1">
                      <Text className="text-white font-semibold">
                        Consistency Master
                      </Text>
                      <Text className="text-gray-400">
                        10+ workouts completed!
                      </Text>
                    </View>
                  </View>
                )}
              </>
            );
          })()}
        </View>
      </ScrollView>
    );
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
            onPress={() => {
              setSelectedWorkout(null);
              setHistoryView("details");
            }}
            className="bg-gray-700 px-4 py-2 rounded-lg"
          >
            <Text className="text-white">Back</Text>
          </TouchableOpacity>
        </View>

        {/* View Toggle */}
        <View className="flex-row bg-gray-800 rounded-lg p-1 mb-4">
          <TouchableOpacity
            onPress={() => setHistoryView("details")}
            className={`flex-1 py-3 rounded-lg ${
              historyView === "details" ? "bg-blue-600" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                historyView === "details" ? "text-white" : "text-gray-400"
              }`}
            >
              Details
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setHistoryView("progress")}
            className={`flex-1 py-3 rounded-lg ${
              historyView === "progress" ? "bg-blue-600" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                historyView === "progress" ? "text-white" : "text-gray-400"
              }`}
            >
              Progress
            </Text>
          </TouchableOpacity>
        </View>

        {historyView === "progress" ? (
          renderProgressView()
        ) : (
          <>
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
          </>
        )}
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
