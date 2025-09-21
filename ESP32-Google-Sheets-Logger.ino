/*
 * ESP32 Sensor Data Logger with Google Sheets Integration
 * 
 * This code sends temperature, humidity, and alarm status data to Google Sheets
 * via Google Apps Script Web App and receives threshold values back.
 * 
 * Required Libraries:
 * - WiFi (built-in)
 * - HTTPClient (built-in)
 * - ArduinoJson (install via Library Manager)
 * - DHT sensor library (if using DHT22/DHT11)
 * 
 * Hardware Connections:
 * - DHT22 Data Pin: GPIO 4
 * - LED Alarm Pin: GPIO 2
 * - Button Pin: GPIO 0 (built-in BOOT button)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Google Apps Script Web App URL
const char* webAppURL = "YOUR_WEB_APP_URL_HERE";

// DHT Sensor Configuration
#define DHT_PIN 4
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// Pin Configuration
const int LED_ALARM_PIN = 2;
const int BUTTON_PIN = 0;

// Variables
float temperature = 0.0;
float humidity = 0.0;
String alarmStatus = "OFF";
float temperatureThreshold = 35.0;
float humidityThreshold = 70.0;

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
unsigned long lastThresholdGet = 0;
const unsigned long SENSOR_INTERVAL = 5000;    // Read sensor every 5 seconds
const unsigned long SEND_INTERVAL = 30000;     // Send data every 30 seconds
const unsigned long THRESHOLD_INTERVAL = 300000; // Get thresholds every 5 minutes

// Button debouncing
bool lastButtonState = HIGH;
bool buttonState = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 50;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== ESP32 Google Sheets Sensor Logger ===");
  
  // Initialize pins
  pinMode(LED_ALARM_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  digitalWrite(LED_ALARM_PIN, LOW);
  
  // Initialize DHT sensor
  dht.begin();
  Serial.println("DHT sensor initialized");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Get initial thresholds
  getThresholds();
  
  Serial.println("Setup completed!");
  Serial.println("System ready to log sensor data...\n");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Attempting to reconnect...");
    connectToWiFi();
  }
  
  // Read sensors
  if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
    readSensors();
    checkAlarmConditions();
    lastSensorRead = currentTime;
  }
  
  // Send data to Google Sheets
  if (currentTime - lastDataSend >= SEND_INTERVAL) {
    sendSensorData();
    lastDataSend = currentTime;
  }
  
  // Get thresholds from Google Sheets
  if (currentTime - lastThresholdGet >= THRESHOLD_INTERVAL) {
    getThresholds();
    lastThresholdGet = currentTime;
  }
  
  // Check manual alarm reset button
  checkButton();
  
  delay(100); // Small delay to prevent excessive CPU usage
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\nFailed to connect to WiFi!");
    Serial.println("Please check your credentials and try again.");
  }
}

void readSensors() {
  // Read DHT sensor
  float newTemperature = dht.readTemperature();
  float newHumidity = dht.readHumidity();
  
  // Check if readings are valid
  if (!isnan(newTemperature) && !isnan(newHumidity)) {
    temperature = newTemperature;
    humidity = newHumidity;
    
    Serial.println("--- Sensor Reading ---");
    Serial.printf("Temperature: %.1f°C\n", temperature);
    Serial.printf("Humidity: %.1f%%\n", humidity);
    Serial.printf("Alarm Status: %s\n", alarmStatus.c_str());
    Serial.println("----------------------");
  } else {
    Serial.println("Failed to read from DHT sensor!");
  }
}

void checkAlarmConditions() {
  bool alarmTriggered = false;
  
  // Check temperature threshold
  if (temperature > temperatureThreshold) {
    Serial.printf("WARNING: Temperature (%.1f°C) exceeds threshold (%.1f°C)\n", 
                  temperature, temperatureThreshold);
    alarmTriggered = true;
  }
  
  // Check humidity threshold
  if (humidity > humidityThreshold) {
    Serial.printf("WARNING: Humidity (%.1f%%) exceeds threshold (%.1f%%)\n", 
                  humidity, humidityThreshold);
    alarmTriggered = true;
  }
  
  // Update alarm status
  if (alarmTriggered && alarmStatus == "OFF") {
    alarmStatus = "ON";
    digitalWrite(LED_ALARM_PIN, HIGH);
    Serial.println("🚨 ALARM ACTIVATED!");
  }
  
  // Update LED
  digitalWrite(LED_ALARM_PIN, alarmStatus == "ON" ? HIGH : LOW);
}

void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Cannot send data: WiFi not connected");
    return;
  }
  
  Serial.println("\n📤 Sending data to Google Sheets...");
  
  HTTPClient http;
  http.begin(webAppURL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // 10 second timeout
  
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["Temperature"] = temperature;
  doc["Humidity"] = humidity;
  doc["StatusAlarm"] = alarmStatus;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("Payload: " + jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("Response Code: %d\n", httpResponseCode);
    Serial.println("Response: " + response);
    
    // Parse response to check for success
    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, response);
    
    if (responseDoc["result"] == "success") {
      Serial.println("✅ Data sent successfully!");
    } else {
      Serial.println("❌ Server reported error: " + responseDoc["error"].as<String>());
    }
  } else {
    Serial.printf("❌ HTTP Error: %d\n", httpResponseCode);
    Serial.println("Failed to send data to Google Sheets");
  }
  
  http.end();
  Serial.println("---");
}

void getThresholds() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Cannot get thresholds: WiFi not connected");
    return;
  }
  
  Serial.println("\n📥 Getting thresholds from Google Sheets...");
  
  HTTPClient http;
  http.begin(webAppURL);
  http.setTimeout(10000); // 10 second timeout
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("Response Code: %d\n", httpResponseCode);
    Serial.println("Response: " + response);
    
    // Parse JSON response
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      if (doc.containsKey("ThresholdTemperature")) {
        temperatureThreshold = doc["ThresholdTemperature"];
      }
      if (doc.containsKey("ThresholdHumidity")) {
        humidityThreshold = doc["ThresholdHumidity"];
      }
      
      Serial.printf("✅ Thresholds updated:\n");
      Serial.printf("   Temperature: %.1f°C\n", temperatureThreshold);
      Serial.printf("   Humidity: %.1f%%\n", humidityThreshold);
    } else {
      Serial.println("❌ Failed to parse JSON response");
    }
  } else {
    Serial.printf("❌ HTTP Error: %d\n", httpResponseCode);
    Serial.println("Failed to get thresholds from Google Sheets");
  }
  
  http.end();
  Serial.println("---");
}

void checkButton() {
  // Read button state
  int reading = digitalRead(BUTTON_PIN);
  
  // If the button state has changed
  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }
  
  // If the button has been stable for the debounce delay
  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (reading != buttonState) {
      buttonState = reading;
      
      // If button is pressed (LOW due to pull-up)
      if (buttonState == LOW) {
        Serial.println("🔘 Button pressed - Resetting alarm");
        alarmStatus = "OFF";
        digitalWrite(LED_ALARM_PIN, LOW);
        
        // Send immediate update to Google Sheets
        sendSensorData();
      }
    }
  }
  
  lastButtonState = reading;
}

// Utility function to print system information
void printSystemInfo() {
  Serial.println("\n=== System Information ===");
  Serial.printf("ESP32 Chip ID: %llX\n", ESP.getEfuseMac());
  Serial.printf("Free Heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("WiFi RSSI: %d dBm\n", WiFi.RSSI());
  Serial.printf("Uptime: %lu seconds\n", millis() / 1000);
  Serial.println("===========================\n");
}

// Function to handle serial commands (for debugging)
void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    command.toLowerCase();
    
    if (command == "info") {
      printSystemInfo();
    } else if (command == "send") {
      sendSensorData();
    } else if (command == "get") {
      getThresholds();
    } else if (command == "alarm") {
      alarmStatus = (alarmStatus == "ON") ? "OFF" : "ON";
      digitalWrite(LED_ALARM_PIN, alarmStatus == "ON" ? HIGH : LOW);
      Serial.println("Alarm toggled: " + alarmStatus);
    } else if (command == "help") {
      Serial.println("\nAvailable commands:");
      Serial.println("  info  - Show system information");
      Serial.println("  send  - Send data to Google Sheets");
      Serial.println("  get   - Get thresholds from Google Sheets");
      Serial.println("  alarm - Toggle alarm status");
      Serial.println("  help  - Show this help message");
    } else {
      Serial.println("Unknown command. Type 'help' for available commands.");
    }
  }
}