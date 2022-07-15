let mainData = {};

function checkTime(i) {
  if (i < 10) {
    i = "0" + i;
  }
  return i;
}

function dateFormat(dateString) {
  let today = new Date(dateString);
  let h = checkTime(today.getHours());
  let m = checkTime(today.getMinutes());
  return h + ":" + m;
}

function billingFormat(billing) {
  return (billing / 100).toFixed(2)
}

function durationToTimeFormat(duration) {
  const millisecond = duration * 1000;
  const oneDayMillisecond = 86400000;
  let result = new Date(millisecond).toISOString().substr(11, 8);
  if (millisecond / oneDayMillisecond >= 1) {
    const resultHour = parseInt(result.substr(0, 2));
    const newResultHour =
      resultHour + parseInt(millisecond / oneDayMillisecond) * 24;
    result = newResultHour + result.substr(2);
  }
  return result;
}

function processDetailTable() {
  let table = document.getElementById("detailTable");
  mainData.timeentries.reverse().forEach((day, index) => {
    let row = table.insertRow(index + 1);
    let celDescription = row.insertCell(0);
    let celProject = row.insertCell(1);
    let celTime = row.insertCell(2);
    let celDuration = row.insertCell(3);
    let celDurationBilling = row.insertCell(4);
    celDescription.innerHTML = day.description;
    celProject.innerHTML = day.projectName;
    celTime.innerHTML = `${dateFormat(day.timeInterval.start)}-${dateFormat(
      day.timeInterval.end
    )}`;
    celDuration.innerHTML = durationToTimeFormat(day.timeInterval.duration);
    celDurationBilling.innerHTML = billingFormat(day.amount);
  });
}
 
function processSummaryTable() {
  let totalData = mainData.totals[0];
  let unproductiveHours = 0;
  let sleepingHours = 0;
  let sleepingHoursBilling = 0;
  let totalTimeBilling = 0;

  mainData.timeentries = mainData.timeentries.filter((day) => {
    if (day.projectName == "Sleeping") {
      totalData.totalTime -= day.timeInterval.duration;
      sleepingHours += day.timeInterval.duration;
      sleepingHoursBilling += day.amount;
      return false;
    }
    if (day.projectName == "Unproductive stuff") {
      totalData.totalTime -= day.timeInterval.duration;
      unproductiveHours += day.timeInterval.duration;
      return false;
    }
    totalTimeBilling += day.amount
    return true;
  });

  const inActiveDate = moment(
    mainData.timeentries[0].timeInterval.start
  ).format("LL");

  document.getElementById("date").innerHTML = inActiveDate;
  document.getElementById("total").innerHTML = durationToTimeFormat(
    totalData.totalTime
  );
  document.getElementById("totalBilling").innerHTML = billingFormat(
    totalTimeBilling
  );
  document.getElementById("sleepingHours").innerHTML =
    durationToTimeFormat(sleepingHours);
  document.getElementById("unproductiveHours").innerHTML =
    durationToTimeFormat(unproductiveHours);
  document.getElementById("sleepingHoursBilling").innerHTML = billingFormat(sleepingHoursBilling);

  let project = {};
  mainData.timeentries.forEach((day, index) => {
    if (!project[day.projectName]) {
      project[day.projectName] = {};
    }
    project[day.projectName].duration =
      (project[day.projectName].duration || 0) + day.timeInterval.duration;
    project[day.projectName].percentage = parseInt(
      (project[day.projectName].duration / totalData.totalTime) * 100
    );
    project[day.projectName].billing = (project[day.projectName].billing || 0) + day.amount
  });

  function compare(a, b) {
    if (project[a].percentage > project[b].percentage) {
      return -1;
    }
    if (project[a].percentage < project[b].percentage) {
      return 1;
    }
    return 0;
  }
  let projectArrayKey = Object.keys(project);
  projectArrayKey = projectArrayKey.sort(compare);

  let table = document.getElementById("summaryTable");
  projectArrayKey.forEach((projectKey, index) => {
    let row = table.insertRow(index + 1);
    let celLabel = row.insertCell(0);
    let celValue = row.insertCell(1);
    let celPercentage = row.insertCell(2);
    let celBilling = row.insertCell(3);
    celLabel.innerHTML = projectKey;
    celValue.innerHTML = durationToTimeFormat(project[projectKey].duration);
    celPercentage.innerHTML = project[projectKey].percentage + "%";
    celBilling.innerHTML = billingFormat(project[projectKey].billing)
  });
}

function process() {
  processDetailTable();
  processSummaryTable();
}

function getTimeEntries(defaultWorkspaceId, defaultXAPIKey, dateInput) {
  const newDateInput = new Date(dateInput);

  let dateRangeStart = moment(newDateInput).utcOffset(0);
  dateRangeStart.set({ hour: 3, minute: 0, second: 0, millisecond: 0 });
  let dateRangeEnd = moment(newDateInput).add("days", 1).utcOffset(0);
  dateRangeEnd.set({ hour: 2, minute: 59, second: 59, millisecond: 59 });

  const params = {
    dateRangeStart: dateRangeStart.toISOString(),
    dateRangeEnd: dateRangeEnd.toISOString(),
    sortOrder: "DESCENDING",
    description: "",
    rounding: false,
    withoutDescription: false,
    amountShown: "EARNED",
    zoomLevel: "WEEK",
    userLocale: "en_US",
    customFields: null,
    detailedFilter: {
      sortColumn: "DATE",
      page: 1,
      pageSize: 50,
      auditFilter: null,
      quickbooksSelectType: "ALL",
      options: {
        totals: "CALCULATE",
      },
    },
  };

  const headers = {
    "Content-Type": "application/json",
    "X-Api-Key": defaultXAPIKey,
  };

  axios
    .post(
      `https://reports.api.clockify.me/v1/workspaces/${defaultWorkspaceId}/reports/detailed`,
      params,
      {
        headers: headers,
      }
    )
    .then(function (response) {
      mainData = response.data;
      process();
    })
    .catch(function (error) {
      console.log(error);
    });
}

function getYesterdayDate() {
  const today = new Date();
  const yesterday = new Date(today);

  yesterday.setDate(yesterday.getDate() - 1);

  return yesterday;
}

function loadDefaultData() {
  const defaultWorkspaceId = localStorage.getItem("defaultWorkspaceId");
  const defaultXAPIKey = localStorage.getItem("defaultXAPIKey");
  const dateInput = getYesterdayDate();

  document.getElementById("workspaceIdInput").value = defaultWorkspaceId;
  document.getElementById("xAPIKeyInput").value = defaultXAPIKey;
  document.getElementById("dateInput").valueAsDate = dateInput;
}

loadDefaultData();

function generate() {
  const defaultWorkspaceId = document.getElementById("workspaceIdInput").value;
  const defaultXAPIKey = document.getElementById("xAPIKeyInput").value;
  const dateInput = document.getElementById("dateInput").value;

  localStorage.setItem("defaultWorkspaceId", defaultWorkspaceId);
  localStorage.setItem("defaultXAPIKey", defaultXAPIKey);

  getTimeEntries(defaultWorkspaceId, defaultXAPIKey, dateInput);
}

function selectElementContents() {
  var el = document.getElementById("signature_container");
  var body = document.body,
    range,
    sel;
  if (document.createRange && window.getSelection) {
    range = document.createRange();
    sel = window.getSelection();
    sel.removeAllRanges();
    try {
      range.selectNodeContents(el);
      sel.addRange(range);
    } catch (e) {
      range.selectNode(el);
      sel.addRange(range);
    }
  } else if (body.createTextRange) {
    range = body.createTextRange();
    range.moveToElementText(el);
    range.select();
  }
  document.execCommand("Copy");
}
