# ESP32 Real-time Sensor Dashboard with Google Sheets

## 📋 Project Overview

This project enhances the existing LabVIEW-Modbus communication system by adding a comprehensive **ESP32 sensor data logging solution** with **real-time Google Sheets integration**. The system creates beautiful, automatically updating dashboards and graphs for temperature, humidity, and alarm status monitoring.

### 🎯 Key Features

- ✅ **Real-time Data Logging**: ESP32 sends sensor data to Google Sheets automatically
- ✅ **Dynamic Graphs**: Auto-generated charts for temperature, humidity, and alarm status
- ✅ **Smart Dashboard**: Summary statistics with 24-hour min/max/average calculations
- ✅ **Threshold Management**: Configurable alarm thresholds via Google Sheets
- ✅ **Auto Data Cleanup**: Automatic archiving of old data to maintain performance
- ✅ **Alarm System**: Visual and status-based alarm notifications
- ✅ **Mobile Responsive**: Dashboard works on all device sizes

## 📁 Project Files

| File | Description |
|------|-------------|
| `google-apps-script-realtime-graphs.js` | 🚀 Enhanced Google Apps Script with dashboard features |
| `ESP32-Google-Sheets-Logger.ino` | 📱 Arduino code for ESP32 sensor logging |
| `Google-Apps-Script-Setup-Guide.md` | 📖 Detailed setup and usage instructions |
| `Dashboard-Example.html` | 🎨 HTML preview of the dashboard appearance |
| `README.md` | 📋 This comprehensive project documentation |

## 🏗️ System Architecture

```
ESP32 Sensor → WiFi → Google Apps Script → Google Sheets → Real-time Dashboard
     ↓              ↑                           ↓
DHT22/DHT11    Threshold Values        Charts & Analytics
LED Alarm      Configuration           Data Management
```

## 🚀 Quick Start Guide

### 1. Hardware Setup

**Required Components:**
- ESP32 Development Board
- DHT22 or DHT11 Temperature/Humidity Sensor
- LED (for alarm indication)
- Breadboard and jumper wires

**Connections:**
```
ESP32 Pin    →    Component
GPIO 4       →    DHT22 Data Pin
GPIO 2       →    LED + (Alarm indicator)
GND          →    DHT22 GND & LED -
3.3V         →    DHT22 VCC
GPIO 0       →    Built-in BOOT button (alarm reset)
```

### 2. Google Apps Script Setup

1. **Create Google Sheets:**
   - Open Google Drive → New → Google Sheets
   - Name it "ESP32 Sensor Dashboard"

2. **Setup Apps Script:**
   - In Google Sheets: Extensions → Apps Script
   - Delete default code and paste content from `google-apps-script-realtime-graphs.js`
   - Save the project (Ctrl+S)

3. **Deploy Web App:**
   - Click "Deploy" → "New deployment"
   - Type: "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone"
   - Click "Deploy" and copy the Web App URL

4. **Initialize System:**
   - In Apps Script, run function `initializeSpreadsheet()`
   - Grant permissions when prompted

### 3. ESP32 Programming

1. **Install Required Libraries:**
   ```
   - WiFi (built-in)
   - HTTPClient (built-in)
   - ArduinoJson (Library Manager)
   - DHT sensor library (Library Manager)
   ```

2. **Configure ESP32 Code:**
   - Open `ESP32-Google-Sheets-Logger.ino` in Arduino IDE
   - Update WiFi credentials:
     ```cpp
     const char* ssid = "YOUR_WIFI_SSID";
     const char* password = "YOUR_WIFI_PASSWORD";
     ```
   - Update Web App URL:
     ```cpp
     const char* webAppURL = "YOUR_WEB_APP_URL_HERE";
     ```

3. **Upload and Run:**
   - Select board: "ESP32 Dev Module"
   - Upload the code
   - Open Serial Monitor to see real-time logs

## 📊 Dashboard Features

### Sheets Structure

| Sheet Name | Purpose |
|------------|---------|
| **Data** | Real-time sensor readings with timestamps |
| **Settings** | Threshold configuration and system settings |
| **Dashboard** | Live charts and summary statistics |
| **HistoryData** | Archived data for long-term analysis |

### Real-time Charts

1. **Temperature Trend**: Line chart showing temperature over time
2. **Humidity Trend**: Line chart showing humidity patterns
3. **Alarm Status Timeline**: Column chart tracking alarm events

### Summary Statistics

- Current values for all sensors
- 24-hour minimum, maximum, and average
- Last update timestamp
- Color-coded alarm status

## ⚙️ Configuration Options

### Threshold Settings (Edit in Google Sheets "Settings")

| Setting | Default | Description |
|---------|---------|-------------|
| ThresholdTemperature | 35 | Temperature alarm trigger (°C) |
| ThresholdHumidity | 70 | Humidity alarm trigger (%) |
| MaxDataRows | 1000 | Maximum rows before data archiving |
| ChartUpdateInterval | 1 | Chart refresh frequency (minutes) |

### ESP32 Timing Settings

| Parameter | Default | Description |
|-----------|---------|-------------|
| SENSOR_INTERVAL | 5000ms | How often to read sensors |
| SEND_INTERVAL | 30000ms | How often to send data |
| THRESHOLD_INTERVAL | 300000ms | How often to get thresholds |

## 🔧 Advanced Features

### Data Management
- **Auto-archiving**: Old data moved to HistoryData sheet
- **Performance optimization**: Maintains only recent data for fast loading
- **Export functionality**: Built-in CSV export to Google Drive

### Error Handling
- **WiFi reconnection**: Automatic reconnection on network loss
- **Sensor validation**: Handles invalid sensor readings gracefully
- **HTTP timeouts**: Configurable timeout for web requests

### Manual Controls
- **Button reset**: Physical button to reset alarm status
- **Serial commands**: Debug commands via Serial Monitor
  - `info` - System information
  - `send` - Force data transmission
  - `get` - Retrieve thresholds
  - `alarm` - Toggle alarm status
  - `help` - Show available commands

## 📱 Mobile Compatibility

The dashboard is fully responsive and works on:
- 💻 Desktop computers
- 📱 Smartphones
- 📟 Tablets
- 🖥️ Smart TVs with browsers

## 🔍 Troubleshooting

### Common Issues

**ESP32 won't connect to WiFi:**
- Check SSID and password
- Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
- Verify signal strength

**Data not appearing in Google Sheets:**
- Verify Web App URL is correct
- Check Apps Script deployment settings
- Review execution permissions

**Charts not updating:**
- Run `initializeSpreadsheet()` function
- Check auto-refresh triggers in Apps Script
- Manually run `refreshDashboard()`

**Sensor readings show NaN:**
- Check DHT sensor wiring
- Verify power supply (3.3V for DHT22)
- Replace sensor if faulty

### Debug Tools

1. **Serial Monitor**: Real-time ESP32 status and debug information
2. **Apps Script Logs**: View → Logs in Apps Script editor
3. **Network Monitor**: Check HTTP request/response status
4. **Google Sheets**: Direct data verification

## 🚀 Extending the Project

### Additional Sensors
Add more sensors by modifying:
- ESP32 code to read additional sensors
- Google Apps Script to handle new data fields
- Dashboard to display new charts

### Notifications
Implement alerts via:
- Email notifications (Apps Script built-in)
- LINE Notify integration
- Discord/Slack webhooks
- SMS via third-party services

### Data Analytics
Enhance with:
- Trend analysis algorithms
- Predictive analytics
- Export to BigQuery for advanced analysis
- Machine learning predictions

## 📄 License

This project is open source and available under the MIT License. Feel free to modify and distribute according to your needs.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for:
- Bug fixes
- Feature enhancements
- Documentation improvements
- Translation to other languages

## 📞 Support

For questions or support:
- Check the troubleshooting section
- Review Google Apps Script logs
- Open an issue in this repository
- Refer to the detailed setup guide

## 🎉 Acknowledgments

This project builds upon:
- Original LabVIEW-Modbus communication system
- Google Apps Script platform capabilities
- ESP32 Arduino framework
- DHT sensor library community

---

**Happy monitoring! 🌡️📊✨**