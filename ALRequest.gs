/**
 * Serves the HTML form for leave requests.
 */
const doGet = () => {
  return HtmlService.createHtmlOutputFromFile("ALRequestForm").setTitle(
    "Annual Leave Request Form"
  );
};

/**
 * Fetches employee data, colleagues, and team leads for the form.
 */
const getEmployeeData = (email) => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const empsheet = spreadsheet.getSheetByName(EMPLOYEES_SHEET);
  const settingsheet = spreadsheet.getSheetByName(SETTINGS_SHEET);

  const emplastrow = empsheet.getLastRow();
  const employees = empsheet
    .getRange(`A2:H${emplastrow}`)
    .getValues()
    .filter((row) => row[0].toString().trim() !== "");

  const emp = employees.find((row) => row[1].toString().trim() === email);
  const colleagues = employees
    .filter((row) => row[1].toString().trim() !== email)
    .map((row) => row[0]);

  const teamLeads = settingsheet
    .getRange("C2:D")
    .getValues()
    .filter((row) => row[0].toString().trim() !== "")
    .map((row) => ({ name: row[0], email: row[1] }));

  return {
    empName: emp[0],
    empEmail: emp[1],
    colleagues,
    teamLeads,
  };
};

/**
 * Handles leave request submission, updates sheets, and sends notifications.
 */
const sendAndUpdateALRequest = ({
  empName,
  empEmail,
  startDate,
  daysCount,
  leaveType,
  responsibleColleague,
  teamLead,
  vacationType,
}) => {
  try {
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

    const teamLeadMng = settingsheet
      .getRange("C2:D")
      .getValues()
      .find((row) => row[1] === teamLead);

    const emailTemplates = settingsheet.getRange("E2:G").getValues();

    const alRequestHRNotify = emailTemplates.find(
      (row) => row[0].toString().trim() === "AL_REQUEST_HR_NOTIFY"
    );
    const alRequestTeamLeadNotify = emailTemplates.find(
      (row) => row[0].toString().trim() === "AL_REQUEST_TEAMLEAD_NOTIFY"
    );

    const compOffHRNotify = emailTemplates.find(
      (row) => row[0].toString().trim() === "COMP_OFF_HR_NOTIFY"
    );
    const compOffTeamLeadNotify = emailTemplates.find(
      (row) => row[0].toString().trim() === "COMP_OFF_TEAMLEAD_NOTIFY"
    );

    const date = new Date(startDate);
    let endDate = new Date(date);
    endDate.setDate(endDate.getDate() + parseInt(daysCount) - 1);
    const dateStr = getFormattedDate(date);
    const endDateStr = getFormattedDate(endDate);

    const resColl =
      responsibleColleague.toString().trim() !== ""
        ? responsibleColleague
        : "N/A";

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      if (emp[0].toString().trim() === "") {
        continue;
      }

      if (emp[1].toString().trim() === empEmail) {
        let leavesUsed = emp[5].toString().trim() === "" ? 0 : parseInt(emp[5]);
        let leavesRemining =
          emp[6].toString().trim() !== ""
            ? parseInt(emp[6])
            : emp[4].toString().trim() !== ""
            ? parseInt(emp[4])
            : 0;
        if (leaveType === "Annual Leave") {
          empsheet
            .getRange(`E${i + 2}:H${i + 2}`)
            .setValues([
              [
                emp[4],
                leavesUsed + parseInt(daysCount),
                leavesRemining - parseInt(daysCount),
                dateStr,
              ],
            ]);

          const hrSubject = alRequestHRNotify[1]
            .toString()
            .replace(/\[EMP_NAME\]/gi, empName);

          const hrBody = alRequestHRNotify[2]
            .toString()
            .replace(/\[EMP_NAME\]/gi, empName)
            .replace(/\[START_DATE\]/gi, dateStr)
            .replace(/\[END_DATE\]/gi, endDateStr)
            .replace(/\[DAYS_COUNT\]/gi, daysCount)
            .replace(/\[LEAVE_TYPE\]/gi, leaveType)
            .replace(/\[RES_COLL\]/gi, resColl)
            .replace(/\[TEAMLEAD_NAME\]/gi, teamLeadMng[0])
            .replace(/\[VACATION_TYPE\]/gi, vacationType);

          for (let hr of hrEmails) {
            sendEmail(hr, hrSubject, hrBody);
          }
          const tlSubject = alRequestTeamLeadNotify[1]
            .toString()
            .replace(/\[EMP_NAME\]/gi, empName);
          const tlBody = alRequestTeamLeadNotify[2]
            .toString()
            .replace(/\[TEAMLEAD_NAME\]/gi, teamLeadMng[0])
            .replace(/\[EMP_NAME\]/gi, empName)
            .replace(/\[START_DATE\]/gi, dateStr)
            .replace(/\[END_DATE\]/gi, endDateStr)
            .replace(/\[DAYS_COUNT\]/gi, daysCount)
            .replace(/\[LEAVE_TYPE\]/gi, leaveType)
            .replace(/\[RES_COLL\]/gi, resColl)
            .replace(/\[VACATION_TYPE\]/gi, vacationType);

          sendEmail(teamLeadMng[1], tlSubject, tlBody);

          spreadsheet
            .getSheetByName(AL_STATISTIC_SHEET)
            .appendRow([
              empName,
              empEmail,
              dateStr,
              endDateStr,
              leaveType,
              vacationType,
              daysCount,
            ]);
        } else {
          empsheet
            .getRange(`E${i + 2}:G${i + 2}`)
            .setValues([
              [
                parseInt(emp[4] || 0) + parseInt(daysCount),
                emp[5],
                parseInt(emp[6] || 0) + parseInt(daysCount),
              ],
            ]);

          const hrSubject = compOffHRNotify[1]
            .toString()
            .replace(/\[EMP_NAME\]/gi, empName);

          const hrBody = compOffHRNotify[2]
            .toString()
            .replace(/\[EMP_NAME\]/gi, empName)
            .replace(/\[START_DATE\]/gi, dateStr)
            .replace(/\[DAYS_COUNT\]/gi, daysCount)
            .replace(/\[RES_COLL\]/gi, resColl)
            .replace(/\[TEAMLEAD_NAME\]/gi, teamLeadMng[0])
            .replace(/\[VACATION_TYPE\]/gi, vacationType);

          for (let hr of hrEmails) {
            sendEmail(hr, hrSubject, hrBody);
          }

          const tlSubject = compOffTeamLeadNotify[1]
            .toString()
            .replace(/\[EMP_NAME\]/gi, empName);
          const tlBody = compOffTeamLeadNotify[2]
            .toString()
            .replace(/\[TEAMLEAD_NAME\]/gi, teamLeadMng[0])
            .replace(/\[EMP_NAME\]/gi, empName)
            .replace(/\[START_DATE\]/gi, dateStr)
            .replace(/\[DAYS_COUNT\]/gi, daysCount)
            .replace(/\[RES_COLL\]/gi, resColl)
            .replace(/\[VACATION_TYPE\]/gi, vacationType);

          sendEmail(teamLeadMng[1], tlSubject, tlBody);

          spreadsheet
            .getSheetByName(AL_STATISTIC_SHEET)
            .appendRow([
              empName,
              empEmail,
              dateStr,
              endDateStr,
              leaveType,
              vacationType,
              daysCount,
            ]);
        }

        return {
          message: `${leaveType} request submitted successfully. You can now close this window.`,
        };
      }
    }
    return {
      error:
        "Something went wrong. Could not submit the request. Please contact HR Department.",
    };
  } catch (err) {
    Logger.log(err);
    return {
      error:
        "Something went wrong. Could not submit the request. Please contact HR Department.",
    };
  }
};
