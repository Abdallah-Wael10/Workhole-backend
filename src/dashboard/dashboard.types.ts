export interface WeekDay {
  date: string;
  workHours: number;
  isCurrentMonth: boolean;
  dayOfMonth: number;
  dayOfWeek: number;
}

export interface Week {
  weekNumber: number;
  days: WeekDay[];
}

export interface WeeklyHeatChart {
  month: number;
  year: number;
  weeks: Week[];
}

export interface DashboardResponse {
  currentStatus: string;
  leaveStatus: string;
  dailyShift: string;
  clockIn: string | null;
  heatChart: WeeklyHeatChart;
  currentMonth: number;
  currentYear: number;
}
