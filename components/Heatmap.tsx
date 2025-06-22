import React from "react";
import Svg, { G, Rect, Text } from "react-native-svg";

const cellSize = 20;
const cellGap = 5;

type MonthMap = {
  [key: number]: string;
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

type HeatmapProps = {
  history: WorkoutHistoryItem[];
  emptyColor: string;
  filledColor: string;
};

const Heatmap: React.FC<HeatmapProps> = ({
  history,
  emptyColor,
  filledColor,
}) => {
  const monthNames: MonthMap = {
    1: "Jan",
    2: "Feb",
    3: "Mar",
    4: "Apr",
    5: "May",
    6: "Jun",
    7: "Jul",
    8: "Aug",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
  };

  const date: Date = new Date();
  const currentYear = date.getFullYear();

  const currentMonth = date.getMonth() + 1;
  const lastMonth = ((date.getMonth() + 11) % 12) + 1;
  const lastLastMonth = ((date.getMonth() + 10) % 12) + 1;

  const enddate = new Date(currentYear, currentMonth, 0);
  const lastenddate = new Date(currentYear, lastMonth, 0);
  const lastLastenddate = new Date(currentYear, lastLastMonth, 0);

  const lastLastMonthDays = Array.from(
    { length: Number(lastLastenddate.toString().slice(8, 11)) },
    (_, i) => i + 1,
  );

  const lastMonthDays = Array.from(
    { length: Number(lastenddate.toString().slice(8, 11)) },
    (_, i) => i + 1,
  );

  const thisMonthDays = Array.from(
    { length: Number(enddate.toString().slice(8, 11)) },
    (_, i) => i + 1,
  );

  const setDaysWorked = (): void => {
    if (!history) return;
    history.forEach((historyItem) => {
      const compare = {
        month: Number(historyItem.endTime.slice(5, 7)),
        day: Number(historyItem.endTime.slice(8, 10)),
      };
      if (compare.month === currentMonth) {
        thisMonthDays[compare.day - 1] = -1;
      } else if (compare.month === lastMonth) {
        lastMonthDays[compare.day - 1] = -1;
      } else if (compare.month === lastLastMonth) {
        lastLastMonthDays[compare.day - 1] = -1;
      }
    });
  };

  const getTotalDaysInMonth = (): number[] => {
    return [...lastLastMonthDays, ...lastMonthDays, ...thisMonthDays];
  };

  setDaysWorked();
  const allDays = getTotalDaysInMonth();

  return (
    <Svg
      width={13 * cellSize + 100}
      height={Math.ceil(allDays.length / 7) * (cellSize + cellGap) * 0.7}
    >
      <G transform="translate(30,30)">
        <Text x={210} y={-10} fill={"rgb(255,255,255)"} fontWeight="800">
          {monthNames[currentMonth]}
        </Text>

        <Text x={110} y={-10} fill={"rgb(255,255,255)"} fontWeight="800">
          {monthNames[lastMonth]}
        </Text>

        <Text x={10} y={-10} fill={"rgb(255,255,255)"} fontWeight="800">
          {monthNames[lastLastMonth]}
        </Text>
        {allDays.map((day, index) => {
          const col = index % 7;
          const row = Math.floor(index / 7);

          return (
            <Rect
              key={index}
              x={row * (cellSize + cellGap)}
              y={col * (cellSize + cellGap)}
              width={cellSize}
              height={cellSize}
              fill={day === -1 ? filledColor : emptyColor}
            />
          );
        })}
      </G>
    </Svg>
  );
};

export default Heatmap;
