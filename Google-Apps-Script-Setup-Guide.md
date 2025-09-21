# Google Apps Script - Real-time Sensor Data Dashboard

## คำอธิบาย (Description)

Google Apps Script นี้เป็นการพัฒนาต่อยอดจากโค้ดเดิมที่รับข้อมูลเซ็นเซอร์จาก ESP32 โดยเพิ่มฟีเจอร์การแสดงผลแบบ Real-time Graph และ Dashboard ที่สมบูรณ์

### ฟีเจอร์หลัก (Main Features)

1. **รับข้อมูลจาก ESP32** - รับข้อมูลอุณหภูมิ, ความชื้น, และสถานะแจ้งเตือน
2. **ส่งค่า Threshold กลับไป ESP32** - ส่งค่าขีดจำกัดที่ตั้งไว้
3. **สร้างกราฟแบบ Real-time** - แสดงกราฟอุณหภูมิ, ความชื้น, และสถานะแจ้งเตือน
4. **Dashboard สรุปข้อมูล** - แสดงข้อมูลปัจจุบัน, ค่าต่ำสุด, สูงสุด, และเฉลี่ย
5. **จัดการข้อมูลอัตโนมัติ** - ลบข้อมูลเก่าและเก็บไว้ใน History
6. **Auto-refresh** - อัพเดทกราฟอัตโนมัติ

## โครงสร้าง Sheets

### 1. Sheet "Data" 
- เก็บข้อมูลเซ็นเซอร์แบบ Real-time
- คอลัมน์: Timestamp, Temperature (°C), Humidity (%), Alarm Status

### 2. Sheet "Settings"
- เก็บการตั้งค่าต่างๆ
- ThresholdTemperature: ค่าขีดจำกัดอุณหภูมิ
- ThresholdHumidity: ค่าขีดจำกัดความชื้น
- MaxDataRows: จำนวนแถวข้อมูลสูงสุดที่เก็บไว้
- ChartUpdateInterval: ช่วงเวลาอัพเดทกราฟ

### 3. Sheet "Dashboard"
- แสดงกราฟและสรุปข้อมูล Real-time
- กราฟ Temperature Trend
- กราฟ Humidity Trend  
- กราฟ Alarm Status Timeline
- ตารางสรุปข้อมูล (ปัจจุบัน, ต่ำสุด, สูงสุด, เฉลี่ย)

### 4. Sheet "HistoryData"
- เก็บข้อมูลเก่าที่ถูกย้ายออกจาก Sheet "Data"

## การติดตั้งและใช้งาน

### ขั้นตอนที่ 1: สร้าง Google Apps Script Project

1. เปิด Google Drive และสร้าง Google Sheets ใหม่
2. ไปที่ Extensions > Apps Script
3. ลบโค้ดเดิมทั้งหมดและวางโค้ดจากไฟล์ `google-apps-script-realtime-graphs.js`
4. บันทึกโปรเจค (Ctrl+S)

### ขั้นตอนที่ 2: Deploy Web App

1. ใน Apps Script Editor คลิก "Deploy" > "New deployment"
2. เลือก type เป็น "Web app"
3. ตั้งค่า:
   - Execute as: "Me"
   - Who has access: "Anyone"
4. คลิก "Deploy" และคัดลอก Web App URL

### ขั้นตอนที่ 3: เริ่มต้นระบบ

1. ใน Apps Script Editor ไปที่ฟังก์ชัน `initializeSpreadsheet`
2. คลิก "Run" เพื่อสร้าง Sheets ทั้งหมดและตั้งค่าระบบ
3. อนุญาตการเข้าถึงข้อมูลเมื่อระบบถาม

### ขั้นตอนที่ 4: กำหนดค่า ESP32

ใช้ Web App URL ที่ได้จากขั้นตอนที่ 2 ใน ESP32 code:

```cpp
// ESP32 Example Code
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* webAppURL = "YOUR_WEB_APP_URL_HERE";

void sendSensorData(float temperature, float humidity, String alarmStatus) {
  HTTPClient http;
  http.begin(webAppURL);
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument doc(1024);
  doc["Temperature"] = temperature;
  doc["Humidity"] = humidity;
  doc["StatusAlarm"] = alarmStatus;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Response: " + response);
  }
  
  http.end();
}

void getThresholds() {
  HTTPClient http;
  http.begin(webAppURL);
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, response);
    
    float tempThreshold = doc["ThresholdTemperature"];
    float humThreshold = doc["ThresholdHumidity"];
    
    Serial.println("Temperature Threshold: " + String(tempThreshold));
    Serial.println("Humidity Threshold: " + String(humThreshold));
  }
  
  http.end();
}
```

## ฟังก์ชันสำคัญ

### `doPost(e)` 
- รับข้อมูลจาก ESP32
- บันทึกลงใน Sheet "Data"
- อัพเดท Dashboard อัตโนมัติ
- ทำความสะอาดข้อมูลเก่า

### `doGet(e)`
- ส่งค่า Threshold กลับไป ESP32
- อ่านค่าจาก Sheet "Settings"

### `updateDashboard(spreadsheet)`
- อัพเดทกราฟและตารางสรุป
- คำนวณค่าสถิติ 24 ชั่วโมงล่าสุด
- เปลี่ยนสีตามสถานะแจ้งเตือน

### `initializeSpreadsheet()`
- สร้าง Sheets ทั้งหมดที่จำเป็น
- ตั้งค่า Auto-refresh trigger
- เรียกใช้เพียงครั้งเดียวตอนเริ่มต้น

### `refreshDashboard()`
- รีเฟรช Dashboard ด้วยตนเอง
- ถูกเรียกอัตโนมัติทุก 5 นาที

## การปรับแต่ง

### เปลี่ยนจำนวนข้อมูลที่เก็บ
แก้ไขค่าใน Sheet "Settings":
- MaxDataRows: จำนวนแถวสูงสุด (default: 1000)

### เปลี่ยนค่า Threshold
แก้ไขค่าใน Sheet "Settings":
- ThresholdTemperature: ค่าขีดจำกัดอุณหภูมิ
- ThresholdHumidity: ค่าขีดจำกัดความชื้น

### ปรับช่วงเวลา Auto-refresh
แก้ไขในฟังก์ชัน `setupAutoRefresh()`:
```javascript
// เปลี่ยนจาก everyMinutes(5) เป็นค่าที่ต้องการ
ScriptApp.newTrigger('refreshDashboard')
  .timeBased()
  .everyMinutes(1) // รีเฟรชทุก 1 นาที
  .create();
```

## การแก้ไขปัญหา

### ปัญหา: กราฟไม่อัพเดท
**วิธีแก้:**
1. ตรวจสอบว่าฟังก์ชัน `initializeSpreadsheet()` ถูกเรียกใช้แล้ว
2. ลองเรียกฟังก์ชัน `refreshDashboard()` ด้วยตนเอง
3. ตรวจสอบ Trigger ใน Apps Script (Edit > Current project's triggers)

### ปัญหา: ESP32 ส่งข้อมูลไม่ได้
**วิธีแก้:**
1. ตรวจสอบ Web App URL ว่าถูกต้อง
2. ตรวจสอบว่า Deploy เป็น "Anyone" access
3. ดู Log ใน Apps Script (View > Logs)

### ปัญหา: ข้อมูลใน Sheet ไม่ถูกต้อง
**วิธีแก้:**
1. ตรวจสอบรูปแบบ JSON ที่ส่งจาก ESP32
2. ดู Error log ใน Apps Script
3. ลองใช้ฟังก์ชัน `testPost()` เพื่อทดสอบ

## ฟีเจอร์เพิ่มเติม

### Export ข้อมูลเป็น CSV
เรียกใช้ฟังก์ชัน `exportDataToCSV()` เพื่อส่งออกข้อมูลเป็นไฟล์ CSV ใน Google Drive

### ทดสอบระบบ
- `testPost()`: ทดสอบการรับข้อมูล
- `testGet()`: ทดสอบการส่ง Threshold

## การบำรุงรักษา

1. **ตรวจสอบ Quota**: Google Apps Script มี Quota จำกัด ตรวจสอบการใช้งานเป็นประจำ
2. **ทำความสะอาดข้อมูล**: ระบบจะลบข้อมูลเก่าอัตโนมัติ แต่สามารถปรับค่าได้
3. **สำรองข้อมูล**: ใช้ฟังก์ชัน Export หรือดาวน์โหลด Google Sheets เป็นประจำ

## ข้อจำกัด

1. **Execution time**: Google Apps Script จำกัดเวลาทำงานสูงสุด 6 นาที
2. **Quota**: มีข้อจำกัดจำนวนการเรียกใช้ต่อวัน
3. **Real-time**: การอัพเดทไม่ใช่ Real-time 100% เนื่องจากข้อจำกัดของ Google Sheets

## การพัฒนาต่อ

สามารถเพิ่มฟีเจอร์เหล่านี้ได้:

1. **การแจ้งเตือนทาง Email**: เมื่อเกิน Threshold
2. **การส่ง Line Notify**: แจ้งเตือนผ่าน Line
3. **Multiple Sensors**: รองรับเซ็นเซอร์หลายตัว
4. **Data Analytics**: วิเคราะห์ข้อมูลขั้นสูง
5. **Mobile App**: สร้าง Google Sites เพื่อดูบนมือถือ

## ตัวอย่างการใช้งาน

```javascript
// ตัวอย่างข้อมูลที่ ESP32 ส่งมา (POST)
{
  "Temperature": 28.5,
  "Humidity": 65.2,
  "StatusAlarm": "OFF"
}

// ตัวอย่างข้อมูลที่ส่งกลับไป ESP32 (GET)
{
  "ThresholdTemperature": 35,
  "ThresholdHumidity": 70
}
```

สำหรับคำถามหรือปัญหาเพิ่มเติม กรุณาตรวจสอบ Log ใน Google Apps Script หรือติดต่อผู้พัฒนา