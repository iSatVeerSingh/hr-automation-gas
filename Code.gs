// Main HR Automation logic for notifications, reminders and annual leave requests

/**
 * Send birthday notifications / reminders to colleagues and HR
 */

const sendBirthdayNotifications = () => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const employeesheet = spreadsheet.getSheetByName(EMPLOYEES_SHEET);
  const settingsheet = spreadsheet.getSheetByName(SETTINGS_SHEET);

  const emplastrow = employeesheet.getLastRow();
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

    const birthday = parseDate(birthdayStr);
    const thisYearBirthday = new Date(
      today.getFullYear(),
      birthday.getMonth(),
      birthday.getDate()
    );

    const thisYearBirthdayFormatted = getFormattedDate(thisYearBirthday);

    if (isSameDay(today, thisYearBirthday)) {
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

    if (isSameDay(today, notifydate)) {
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
