/**
 * Date helpers used across scheduling, analytics, and habit-streak logic.
 * Keep these pure and timezone-explicit — the caller decides which
 * timezone the "date" belongs to (usually the user's profile.timezone).
 */

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addMinutes(date, minutes) {
  return new Date(new Date(date).getTime() + minutes * 60000);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffInMinutes(dateA, dateB) {
  return Math.round((new Date(dateA).getTime() - new Date(dateB).getTime()) / 60000);
}

/** Combines a base date with an "HH:mm" time string into a Date object. */
function parseTimeOnDate(date, timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function isSameDay(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekRange(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const start = addDays(d, -day);
  const end = endOfDay(addDays(start, 6));
  return { start, end };
}

function getMonthRange(date) {
  const d = new Date(date);
  const start = startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
  const end = endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return { start, end };
}

module.exports = {
  startOfDay,
  endOfDay,
  addMinutes,
  addDays,
  diffInMinutes,
  parseTimeOnDate,
  isSameDay,
  getWeekRange,
  getMonthRange,
};
