import { v } from "convex/values";

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

export const weekdayNameValidator = v.union(
  v.literal("sunday"),
  v.literal("monday"),
  v.literal("tuesday"),
  v.literal("wednesday"),
  v.literal("thursday"),
  v.literal("friday"),
  v.literal("saturday"),
);

export const weekdayParValidator = v.object({
  sunday: v.number(),
  monday: v.number(),
  tuesday: v.number(),
  wednesday: v.number(),
  thursday: v.number(),
  friday: v.number(),
  saturday: v.number(),
});

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

export const getWeekdayNameFromDate = (date: string): WeekdayName => {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekdayNames[weekday] ?? "sunday";
};
