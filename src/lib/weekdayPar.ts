export const weekdayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type WeekdayName = (typeof weekdayNames)[number];
export type WeekdayParValues = Record<WeekdayName, number>;

export const weekdayLabelByName: Record<WeekdayName, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export const createWeekdayParValues = (value: number): WeekdayParValues => ({
  sunday: value,
  monday: value,
  tuesday: value,
  wednesday: value,
  thursday: value,
  friday: value,
  saturday: value,
});

export const normalizeWeekdayParValues = (
  par: number | WeekdayParValues,
): WeekdayParValues => {
  if (typeof par === "number") {
    return createWeekdayParValues(par);
  }

  return par;
};

export const isWeekdayName = (value: string): value is WeekdayName =>
  weekdayNames.includes(value as WeekdayName);

export const getTodayWeekdayName = (): WeekdayName =>
  weekdayNames[new Date().getDay()] ?? "sunday";
