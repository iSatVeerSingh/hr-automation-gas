/**
 * Send birthday notifications / reminders to colleagues and HR
 */

const sendBirthdayNotifications = () => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const empsheet = spreadsheet.getSheetByName(EMPLOYEES_SHEET);
  const settingsheet = spreadsheet.getSheetByName(SETTINGS_SHEET);

  const emplastrow = empsheet.getLastRow();
  const employees = empsheet.getRange(`A2:H${emplastrow}`).getValues();
  const hrEmails = settingsheet
    .getRange("A2:B")
    .getValues()
    .filter((row) => row[0].toString().trim() !== "")
    .map((row) => row[1]);

  const emailTemplates = settingsheet.getRange("E2:G").getValues();

  const birthdayEmail = emailTemplates.find(
    (row) => row[0].toString().trim() === "BIRTHDAY_ALERT"
  );
  const birthdayHREmail = emailTemplates.find(
    (row) => row[0].toString().trim() === "BIRTHDAY_ALERT_HR"
  );

  const today = new Date();

  for (let emp of employees) {
    const [name, email, birthdayStr] = emp;

    if (name.toString().trim() === "") {
      continue;
    }

    const birthday = parseDate(birthdayStr);
    const thisYearBirthday = new Date(
      today.getFullYear(),
      birthday.getMonth(),
      birthday.getDate()
    );

    const thisYearBirthdayFormatted = getFormattedDate(thisYearBirthday);

    if (isSameDayMonthYear(today, thisYearBirthday)) {
      const colleagues = employees
        .filter((e) => e[1] !== email)
        .map((e) => e[1]);

      const subject = birthdayEmail[1]
        .toString()
        .replace(/\[EMP_NAME\]/gi, name);
      const body = birthdayEmail[2]
        .toString()
        .replace(/\[EMP_NAME\]/gi, name)
        .replace(/\[BIRTHDAY\]/gi, thisYearBirthdayFormatted);

      for (let coll of colleagues) {
        sendEmail(coll, subject, body);
      }
    }

    const notifydate = getPreviousWorkingDay(thisYearBirthday);

    if (isSameDayMonthYear(today, notifydate)) {
      const subject = birthdayHREmail[1]
        .toString()
        .replace(/\[EMP_NAME\]/gi, name);
      const body = birthdayHREmail[2]
        .toString()
        .replace(/\[EMP_NAME\]/gi, name)
        .replace(/\[BIRTHDAY\]/gi, thisYearBirthdayFormatted);

      for (let hr of hrEmails) {
        sendEmail(hr, subject, body);
      }
    }
  }
};

/**
 * Sends quarterly leave reminders to employees and HR.
 */
const sendQuarterlyLeaveReminders = () => {
  if (!isTodayQuarterlyReminderDate()) return;

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const empsheet = spreadsheet.getSheetByName(EMPLOYEES_SHEET);
  const settingsheet = spreadsheet.getSheetByName(SETTINGS_SHEET);

  const emplastrow = empsheet.getLastRow();
  const employees = empsheet.getRange(`A2:H${emplastrow}`).getValues();

  const hrEmails = settingsheet
    .getRange("A2:B")
    .getValues()
    .filter((row) => row[0].toString().trim() !== "")
    .map((row) => row[1]);
  const emailTemplates = settingsheet.getRange("E2:G").getValues();

  const quarterlyAlReminderEmail = emailTemplates.find(
    (row) => row[0].toString().trim() === "QUARTERLY_AL_REMINDER"
  );
  const obligatoryALReminder = emailTemplates.find(
    (row) => row[0].toString().trim() === "HR_OBLIGATORY_AL_REMINDER"
  );

  const alRequestForm =
    PropertiesService.getScriptProperties().getProperty("AL_REQUEST_FORM");

  for (let emp of employees) {
    const [
      name,
      email,
      _birthdayStr,
      _joinDateStr,
      totalLeaves,
      leavesUsed,
      remainingLeaves,
    ] = emp;

    if (name.toString().trim() === "") {
      continue;
    }

    const subject = quarterlyAlReminderEmail[1]
      .toString()
      .replace(/\[EMP_NAME\]/gi, name);

    const body = quarterlyAlReminderEmail[2]
      .toString()
      .replace(/\[EMP_NAME\]/gi, name)
      .replace(/\[AL_REQUEST_FORM\]/gi, alRequestForm)
      .replace(/\[TOTAL_AL\]/gi, totalLeaves || 0)
      .replace(/\[AL_USED\]/gi, leavesUsed || 0)
      .replace(/\[AL_REMAINING\]/gi, remainingLeaves || 0);

    sendEmail(email, subject, body);

    if (parseInt(leavesUsed || 0) < 14) {
      const hrSubject = obligatoryALReminder[1]
        .toString()
        .replace(/\[EMP_NAME\]/gi, name);
      const hrBody = obligatoryALReminder[2]
        .toString()
        .replace(/\[EMP_NAME\]/gi, name)
        .replace(/\[TOTAL_AL\]/gi, totalLeaves || 0)
        .replace(/\[AL_USED\]/gi, leavesUsed || 0)
        .replace(/\[AL_REMAINING\]/gi, remainingLeaves || 0);

      for (let hr of hrEmails) {
        sendEmail(hr, hrSubject, hrBody);
      }
    }
  }
};

/**
 * Send notification when employee completes 6 months
 * When employee has an anniversary, resert the annual leaves
 */

const manageAnnualLeaves = () => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const empsheet = spreadsheet.getSheetByName(EMPLOYEES_SHEET);
  const settingsheet = spreadsheet.getSheetByName(SETTINGS_SHEET);

  const emplastrow = empsheet.getLastRow();
  const employees = empsheet.getRange(`A2:H${emplastrow}`).getValues();

  const emailTemplates = settingsheet.getRange("E2:G").getValues();

  const alResetAnniversaryEmail = emailTemplates.find(
    (row) => row[0].toString().trim() === "AL_RESET_ANNIVERSARY"
  );

  const sixMonthsEmail = emailTemplates.find(
    (row) => row[0].toString().trim() === "SIX_MONTH_AL_REMINDER"
  );

  const alRequestForm =
    PropertiesService.getScriptProperties().getProperty("AL_REQUEST_FORM");

  for (let i = 0; i < employees.length; i++) {
    const [name, email, _birthdayStr, joinDateStr] = employees[i];

    if (name.toString().trim() === "") {
      continue;
    }

    const joinDate = parseDate(joinDateStr);

    if (isSixMonthComplete(joinDate)) {
      empsheet.getRange(`E${i + 2}:G${i + 2}`).setValues([[21, 0, 21]]);

      const subject = sixMonthsEmail[1]
        .toString()
        .replace(/\[EMP_NAME\]/gi, name);

      const body = sixMonthsEmail[2]
        .toString()
        .replace(/\[EMP_NAME\]/gi, name)
        .replace(/\[AL_REQUEST_FORM\]/gi, alRequestForm);

      sendEmail(email, subject, body);
    }

    if (isAnniversary(joinDate)) {
      empsheet.getRange(`E${i + 2}:G${i + 2}`).setValues([[21, 0, 21]]);
      const years = anniversaryYears(joinDate);
      const subject = alResetAnniversaryEmail[1]
        .toString()
        .replace(/\[EMP_NAME\]/gi, name);

      const body = alResetAnniversaryEmail[2]
        .toString()
        .replace(/\[EMP_NAME\]/gi, name)
        .replace(/\[ANNIVERSARY_YEARS\]/gi, years)
        .replace(/\[AL_REQUEST_FORM\]/gi, alRequestForm);

      sendEmail(email, subject, body);
    }
  }
};

/**
 * Main wrapper function for automatic trigger
 */

const autoTriggerMainFunction = () => {
  sendBirthdayNotifications();
  sendQuarterlyLeaveReminders();
  manageAnnualLeaves();
};
