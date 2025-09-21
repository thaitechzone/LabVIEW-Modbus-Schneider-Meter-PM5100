/**
 * Enhanced Google Apps Script Web App for ESP32 sensor data with Real-time Graphs
 * 
 * Features:
 * - POST: Receive sensor data from ESP32 (Temperature, Humidity, StatusAlarm)
 * - GET: Send threshold values to ESP32
 * - Auto-create and update real-time charts
 * - Data management and cleanup
 * - Dashboard creation
 * 
 * Sheets structure:
 * - "Data": Raw sensor data with timestamps
 * - "Settings": Threshold configuration
 * - "Dashboard": Real-time charts and summary
 * - "HistoryData": Archive for old data
 */

/**
 * Handle HTTP POST requests from ESP32 to log sensor data and update charts
 * Example POST body (JSON): { "Temperature": 30.5, "Humidity": 60, "StatusAlarm": "ON" }
 */
function doPost(e) {
  try {
    var spreadsheet = SpreadsheetApp.getActive();
    var dataSheet = getOrCreateDataSheet(spreadsheet);
    
    var data = JSON.parse(e.postData.contents);
    var timestamp = new Date();
    
    // Prepare row: Timestamp, Temperature, Humidity, StatusAlarm
    var row = [
      timestamp,
      parseFloat(data.Temperature) || 0,
      parseFloat(data.Humidity) || 0,
      data.StatusAlarm || "OFF"
    ];
    
    dataSheet.appendRow(row);
    
    // Update dashboard and charts
    updateDashboard(spreadsheet);
    
    // Clean old data if necessary (keep last 1000 records)
    cleanOldData(dataSheet);
    
    Logger.log("Data received: " + JSON.stringify(row));
    
    return ContentService.createTextOutput(
      JSON.stringify({ 
        result: "success", 
        data: row,
        timestamp: timestamp.toISOString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    Logger.log("doPost Error: " + err.message);
    return ContentService.createTextOutput(
      JSON.stringify({ 
        result: "error", 
        error: err.message 
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle HTTP GET requests from ESP32 to retrieve threshold values
 */
function doGet(e) {
  try {
    var spreadsheet = SpreadsheetApp.getActive();
    var settingsSheet = getOrCreateSettingsSheet(spreadsheet);
    
    var data = settingsSheet.getDataRange().getValues();
    var thresholds = {};
    
    // Read settings from sheet
    for (var i = 0; i < data.length; i++) {
      var key = data[i][0];
      var value = data[i][1];
      if (key === "ThresholdTemperature" || key === "ThresholdHumidity") {
        thresholds[key] = parseFloat(value) || 0;
      }
    }
    
    // Set default values if missing
    if (!thresholds.hasOwnProperty("ThresholdTemperature")) {
      thresholds["ThresholdTemperature"] = 35;
    }
    if (!thresholds.hasOwnProperty("ThresholdHumidity")) {
      thresholds["ThresholdHumidity"] = 70;
    }
    
    Logger.log("doGet Response: " + JSON.stringify(thresholds));
    
    return ContentService.createTextOutput(
      JSON.stringify(thresholds)
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    Logger.log("doGet Error: " + err.message);
    return ContentService.createTextOutput(
      JSON.stringify({ 
        result: "error", 
        error: err.message,
        ThresholdTemperature: 35,
        ThresholdHumidity: 70
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get or create Data sheet with proper headers
 */
function getOrCreateDataSheet(spreadsheet) {
  var sheet = spreadsheet.getSheetByName("Data");
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet("Data");
    
    // Set headers
    var headers = ["Timestamp", "Temperature (°C)", "Humidity (%)", "Alarm Status"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#4285f4");
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");
    
    // Format timestamp column
    sheet.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm:ss");
    
    // Format temperature and humidity columns
    sheet.getRange("B:B").setNumberFormat("0.0");
    sheet.getRange("C:C").setNumberFormat("0.0");
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);
  }
  
  return sheet;
}

/**
 * Get or create Settings sheet with default thresholds
 */
function getOrCreateSettingsSheet(spreadsheet) {
  var sheet = spreadsheet.getSheetByName("Settings");
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet("Settings");
    
    // Set default settings
    var settings = [
      ["Setting", "Value"],
      ["ThresholdTemperature", 35],
      ["ThresholdHumidity", 70],
      ["MaxDataRows", 1000],
      ["ChartUpdateInterval", 1]
    ];
    
    sheet.getRange(1, 1, settings.length, 2).setValues(settings);
    
    // Format headers
    var headerRange = sheet.getRange(1, 1, 1, 2);
    headerRange.setBackground("#34a853");
    headerRange.setFontColor("white");
    headerRange.setFontWeight("bold");
    
    sheet.autoResizeColumns(1, 2);
  }
  
  return sheet;
}

/**
 * Get or create Dashboard sheet with charts and summary
 */
function getOrCreateDashboardSheet(spreadsheet) {
  var sheet = spreadsheet.getSheetByName("Dashboard");
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet("Dashboard");
    
    // Add title
    sheet.getRange("A1").setValue("Real-time Sensor Data Dashboard");
    sheet.getRange("A1").setFontSize(16).setFontWeight("bold");
    
    // Create summary section
    createSummarySection(sheet);
    
    // Create charts
    createTemperatureChart(spreadsheet, sheet);
    createHumidityChart(spreadsheet, sheet);
    createAlarmStatusChart(spreadsheet, sheet);
    
    // Set auto-refresh message
    sheet.getRange("A20").setValue("Dashboard auto-updates when new data is received");
    sheet.getRange("A20").setFontStyle("italic");
  }
  
  return sheet;
}

/**
 * Create summary section in dashboard
 */
function createSummarySection(sheet) {
  var summaryData = [
    ["", "Current", "Min (24h)", "Max (24h)", "Avg (24h)"],
    ["Temperature (°C)", "", "", "", ""],
    ["Humidity (%)", "", "", "", ""],
    ["Last Update", "", "", "", ""],
    ["Alarm Status", "", "", "", ""]
  ];
  
  sheet.getRange(3, 1, summaryData.length, summaryData[0].length).setValues(summaryData);
  
  // Format summary header
  var headerRange = sheet.getRange(3, 1, 1, summaryData[0].length);
  headerRange.setBackground("#ea4335");
  headerRange.setFontColor("white");
  headerRange.setFontWeight("bold");
  
  // Format summary section
  sheet.getRange(3, 1, summaryData.length, summaryData[0].length).setBorder(true, true, true, true, true, true);
}

/**
 * Create temperature chart
 */
function createTemperatureChart(spreadsheet, dashboardSheet) {
  var dataSheet = spreadsheet.getSheetByName("Data");
  if (!dataSheet) return;
  
  var chart = dashboardSheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(dataSheet.getRange("A:A")) // Timestamp
    .addRange(dataSheet.getRange("B:B")) // Temperature
    .setPosition(9, 1, 0, 0)
    .setOption("title", "Temperature Trend (°C)")
    .setOption("width", 600)
    .setOption("height", 300)
    .setOption("hAxis.title", "Time")
    .setOption("vAxis.title", "Temperature (°C)")
    .setOption("legend.position", "bottom")
    .setOption("pointSize", 3)
    .setOption("series.0.color", "#ff6b6b")
    .build();
    
  dashboardSheet.insertChart(chart);
}

/**
 * Create humidity chart
 */
function createHumidityChart(spreadsheet, dashboardSheet) {
  var dataSheet = spreadsheet.getSheetByName("Data");
  if (!dataSheet) return;
  
  var chart = dashboardSheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(dataSheet.getRange("A:A")) // Timestamp
    .addRange(dataSheet.getRange("C:C")) // Humidity
    .setPosition(9, 8, 0, 0)
    .setOption("title", "Humidity Trend (%)")
    .setOption("width", 600)
    .setOption("height", 300)
    .setOption("hAxis.title", "Time")
    .setOption("vAxis.title", "Humidity (%)")
    .setOption("legend.position", "bottom")
    .setOption("pointSize", 3)
    .setOption("series.0.color", "#4ecdc4")
    .build();
    
  dashboardSheet.insertChart(chart);
}

/**
 * Create alarm status chart
 */
function createAlarmStatusChart(spreadsheet, dashboardSheet) {
  var dataSheet = spreadsheet.getSheetByName("Data");
  if (!dataSheet) return;
  
  var chart = dashboardSheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(dataSheet.getRange("A:A")) // Timestamp
    .addRange(dataSheet.getRange("D:D")) // Alarm Status
    .setPosition(21, 1, 0, 0)
    .setOption("title", "Alarm Status Timeline")
    .setOption("width", 600)
    .setOption("height", 200)
    .setOption("hAxis.title", "Time")
    .setOption("vAxis.title", "Alarm Status")
    .setOption("legend.position", "bottom")
    .setOption("series.0.color", "#ffa726")
    .build();
    
  dashboardSheet.insertChart(chart);
}

/**
 * Update dashboard with latest data
 */
function updateDashboard(spreadsheet) {
  try {
    var dataSheet = spreadsheet.getSheetByName("Data");
    var dashboardSheet = getOrCreateDashboardSheet(spreadsheet);
    
    if (!dataSheet) return;
    
    var data = dataSheet.getDataRange().getValues();
    if (data.length <= 1) return; // No data rows
    
    // Get current data (last row)
    var lastRow = data[data.length - 1];
    var currentTemp = lastRow[1];
    var currentHumidity = lastRow[2];
    var currentAlarm = lastRow[3];
    var currentTime = lastRow[0];
    
    // Calculate 24-hour statistics
    var now = new Date();
    var oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    var recentData = data.filter(function(row) {
      return row[0] instanceof Date && row[0] >= oneDayAgo;
    });
    
    var temps = recentData.map(function(row) { return parseFloat(row[1]) || 0; });
    var humidities = recentData.map(function(row) { return parseFloat(row[2]) || 0; });
    
    var tempMin = temps.length > 0 ? Math.min.apply(Math, temps) : 0;
    var tempMax = temps.length > 0 ? Math.max.apply(Math, temps) : 0;
    var tempAvg = temps.length > 0 ? temps.reduce(function(a, b) { return a + b; }, 0) / temps.length : 0;
    
    var humMin = humidities.length > 0 ? Math.min.apply(Math, humidities) : 0;
    var humMax = humidities.length > 0 ? Math.max.apply(Math, humidities) : 0;
    var humAvg = humidities.length > 0 ? humidities.reduce(function(a, b) { return a + b; }, 0) / humidities.length : 0;
    
    // Update summary data
    var summaryData = [
      [currentTemp.toFixed(1), tempMin.toFixed(1), tempMax.toFixed(1), tempAvg.toFixed(1)],
      [currentHumidity.toFixed(1), humMin.toFixed(1), humMax.toFixed(1), humAvg.toFixed(1)],
      [Utilities.formatDate(currentTime, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"), "", "", ""],
      [currentAlarm, "", "", ""]
    ];
    
    dashboardSheet.getRange(4, 2, summaryData.length, summaryData[0].length).setValues(summaryData);
    
    // Color-code alarm status
    var alarmCell = dashboardSheet.getRange(7, 2);
    if (currentAlarm === "ON") {
      alarmCell.setBackground("#ffebee").setFontColor("#c62828");
    } else {
      alarmCell.setBackground("#e8f5e8").setFontColor("#2e7d32");
    }
    
  } catch (err) {
    Logger.log("updateDashboard Error: " + err.message);
  }
}

/**
 * Clean old data to maintain performance
 */
function cleanOldData(dataSheet) {
  try {
    var maxRows = 1000; // Keep last 1000 records
    var data = dataSheet.getDataRange();
    var numRows = data.getNumRows();
    
    if (numRows > maxRows + 1) { // +1 for header
      var rowsToDelete = numRows - maxRows - 1;
      
      // Move old data to history sheet before deleting
      moveToHistory(dataSheet, rowsToDelete);
      
      // Delete old rows (starting from row 2, keeping header)
      dataSheet.deleteRows(2, rowsToDelete);
      
      Logger.log("Cleaned " + rowsToDelete + " old records");
    }
  } catch (err) {
    Logger.log("cleanOldData Error: " + err.message);
  }
}

/**
 * Move old data to history sheet
 */
function moveToHistory(dataSheet, rowsToDelete) {
  try {
    var spreadsheet = SpreadsheetApp.getActive();
    var historySheet = spreadsheet.getSheetByName("HistoryData");
    
    if (!historySheet) {
      historySheet = spreadsheet.insertSheet("HistoryData");
      
      // Copy headers
      var headers = dataSheet.getRange(1, 1, 1, 4).getValues();
      historySheet.getRange(1, 1, 1, 4).setValues(headers);
    }
    
    // Copy old data to history
    var oldData = dataSheet.getRange(2, 1, rowsToDelete, 4).getValues();
    var lastHistoryRow = historySheet.getLastRow();
    
    if (oldData.length > 0) {
      historySheet.getRange(lastHistoryRow + 1, 1, oldData.length, 4).setValues(oldData);
    }
    
  } catch (err) {
    Logger.log("moveToHistory Error: " + err.message);
  }
}

/**
 * Manually refresh dashboard (can be triggered by button or timer)
 */
function refreshDashboard() {
  var spreadsheet = SpreadsheetApp.getActive();
  updateDashboard(spreadsheet);
}

/**
 * Set up automatic refresh trigger (run once to enable)
 */
function setupAutoRefresh() {
  // Delete existing triggers
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'refreshDashboard') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger to refresh every 5 minutes
  ScriptApp.newTrigger('refreshDashboard')
    .timeBased()
    .everyMinutes(5)
    .create();
    
  Logger.log("Auto-refresh trigger created");
}

/**
 * Initialize the spreadsheet with all required sheets and setup
 */
function initializeSpreadsheet() {
  var spreadsheet = SpreadsheetApp.getActive();
  
  // Create all required sheets
  getOrCreateDataSheet(spreadsheet);
  getOrCreateSettingsSheet(spreadsheet);
  getOrCreateDashboardSheet(spreadsheet);
  
  // Setup auto-refresh
  setupAutoRefresh();
  
  Logger.log("Spreadsheet initialized successfully");
}

/**
 * Test functions for development
 */
function testPost() {
  var testData = {
    postData: {
      contents: JSON.stringify({
        Temperature: 25.5,
        Humidity: 65.2,
        StatusAlarm: "OFF"
      })
    }
  };
  
  var result = doPost(testData);
  Logger.log("Test POST result: " + result.getContent());
}

function testGet() {
  var result = doGet({});
  Logger.log("Test GET result: " + result.getContent());
}

/**
 * Export data to CSV (utility function)
 */
function exportDataToCSV() {
  var spreadsheet = SpreadsheetApp.getActive();
  var dataSheet = spreadsheet.getSheetByName("Data");
  
  if (!dataSheet) {
    Logger.log("No data sheet found");
    return;
  }
  
  var data = dataSheet.getDataRange().getValues();
  var csv = "";
  
  data.forEach(function(row) {
    csv += row.join(",") + "\n";
  });
  
  var blob = Utilities.newBlob(csv, "text/csv", "sensor_data_export.csv");
  
  // Save to Drive
  DriveApp.createFile(blob);
  Logger.log("Data exported to Google Drive as sensor_data_export.csv");
}