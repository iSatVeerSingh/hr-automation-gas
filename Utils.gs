// Utility functions for date parsing, formatting, and HR logic

/**
 * Parses a date string or Date object into a Date object.
 * Supports "dd/mm/yyyy", "dd-mm-yyyy", "dd.mm.yyyy" formats.
 */
const parseDate = (value) => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[.\-]/g, "/");
    const [day, month, year] = normalized.split("/");
    return new Date(year, month - 1, day); // month is 0-based
  }
};

/**
 * Checks if two dates are the same day (ignores year).
 */
const isSameDay = (d1, d2) => {
  return d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
};

/**
 * Returns true if the given date is a weekend (Saturday or Sunday).
 */
const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * Returns the previous working day (skips weekends).
 */
const getPreviousWorkingDay = (date) => {
  let previousDay = new Date(date);
  previousDay.setDate(date.getDate() - 1);
  while (isWeekend(previousDay)) {
    previousDay.setDate(previousDay.getDate() - 1);
  }
  return previousDay;
};

/**
 * Formats a date as "dd.MM.yyyy" in GMT+8 timezone.
 */
const getFormattedDate = (date) => {
  return Utilities.formatDate(date, "GMT+8", "dd.MM.yyyy");
};

/**
 * Sends an email using MailApp with a custom sender name.
 */
const sendEmail = (email, subject, body) => {
  MailApp.sendEmail(email, subject, body, {
    name: EMAIL_SENDER,
  });
};

/**
 * Checks if today is the quarterly reminder date (1st of Mar, Jun, Sep, Dec).
 */
const isTodayQuarterlyReminderDate = () => {
  const today = new Date();
  const month = today.getMonth();
  const day = today.getDate();
  return day === 1 && [2, 5, 8, 11].includes(month); // Mar, Jun, Sep, Dec
};
