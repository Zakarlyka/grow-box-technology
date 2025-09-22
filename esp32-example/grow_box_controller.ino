/*
 * ESP32 Grow Box Controller
 * IoT Platform Integration Example
 * 
 * Features:
 * - WiFi connection with Captive Portal
 * - MQTT communication
 * - Sensor readings (DHT22, soil moisture, LDR)
 * - Device control (water pump, LED, fan, heater)
 * - OTA updates support
 */

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <EEPROM.h>
#include <ArduinoOTA.h>

// Pin definitions
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define SOIL_MOISTURE_PIN A0
#define LIGHT_SENSOR_PIN A1
#define WATER_PUMP_PIN 5
#define LED_STRIP_PIN 6
#define FAN_PIN 7
#define HEATER_PIN 8
#define STATUS_LED_PIN 2

// Network configuration
const char* ap_ssid = "GrowBox-Config";
const char* ap_password = "12345678";

// MQTT configuration
const char* mqtt_server = "your-iot-platform.com";
const int mqtt_port = 1883;
const char* device_id = "esp32-grow-001";
const char* user_id = "user123"; // This should be configured per device

// Global objects
DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient espClient;
PubSubClient client(espClient);
WebServer server(80);
DNSServer dnsServer;

// Device state
struct DeviceState {
  bool waterPump = false;
  bool lightSystem = false;
  bool ventilation = false;
  bool heater = false;
  int lightIntensity = 80;
  int fanSpeed = 60;
} deviceState;

// Network credentials storage
struct NetworkConfig {
  char ssid[32];
  char password[64];
  char mqtt_server[64];
  char user_id[32];
  char device_id[32];
} networkConfig;

// Timing variables
unsigned long lastTelemetry = 0;
unsigned long lastHeartbeat = 0;
const unsigned long telemetryInterval = 30000; // 30 seconds
const unsigned long heartbeatInterval = 60000;  // 1 minute

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 Grow Box Controller Starting...");

  // Initialize pins
  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(WATER_PUMP_PIN, OUTPUT);
  pinMode(LED_STRIP_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(HEATER_PIN, OUTPUT);
  
  // Initialize sensors
  dht.begin();
  
  // Load configuration from EEPROM
  EEPROM.begin(512);
  loadConfig();
  
  // Initialize WiFi
  if (strlen(networkConfig.ssid) == 0) {
    startCaptivePortal();
  } else {
    connectToWiFi();
  }
  
  // Initialize MQTT
  client.setServer(networkConfig.mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  
  // Initialize OTA
  setupOTA();
  
  Serial.println("Setup complete!");
}

void loop() {
  unsigned long now = millis();
  
  // Handle different connection states
  if (WiFi.status() != WL_CONNECTED) {
    if (strlen(networkConfig.ssid) == 0) {
      handleCaptivePortal();
    } else {
      connectToWiFi();
    }
    return;
  }
  
  // Handle MQTT connection
  if (!client.connected()) {
    connectToMQTT();
  }
  client.loop();
  
  // Handle OTA updates
  ArduinoOTA.handle();
  
  // Send telemetry data
  if (now - lastTelemetry > telemetryInterval) {
    lastTelemetry = now;
    sendTelemetry();
  }
  
  // Send heartbeat
  if (now - lastHeartbeat > heartbeatInterval) {
    lastHeartbeat = now;
    sendHeartbeat();
  }
  
  // Update device status LED
  updateStatusLED();
  
  delay(100);
}

void startCaptivePortal() {
  Serial.println("Starting Captive Portal...");
  
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ap_ssid, ap_password);
  
  dnsServer.start(53, "*", WiFi.softAPIP());
  
  server.on("/", handleRoot);
  server.on("/config", HTTP_POST, handleConfig);
  server.onNotFound(handleRoot);
  server.begin();
  
  Serial.print("Captive Portal started at: ");
  Serial.println(WiFi.softAPIP());
}

void handleCaptivePortal() {
  dnsServer.processNextRequest();
  server.handleClient();
}

void handleRoot() {
  String html = R"(
<!DOCTYPE html>
<html>
<head>
    <title>Grow Box Configuration</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; margin: 40px; background: #f0f0f0; }
        .container { background: white; padding: 20px; border-radius: 8px; max-width: 400px; margin: 0 auto; }
        input, select { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #4CAF50; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
        button:hover { background: #45a049; }
        h2 { color: #333; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h2>🌱 Grow Box Setup</h2>
        <form action="/config" method="POST">
            <label>WiFi Network:</label>
            <input type="text" name="ssid" placeholder="Enter WiFi Name" required>
            
            <label>WiFi Password:</label>
            <input type="password" name="password" placeholder="Enter WiFi Password" required>
            
            <label>IoT Platform Server:</label>
            <input type="text" name="mqtt_server" value="your-iot-platform.com" required>
            
            <label>User ID:</label>
            <input type="text" name="user_id" placeholder="Your User ID" required>
            
            <label>Device Name:</label>
            <input type="text" name="device_id" placeholder="grow-box-001" required>
            
            <button type="submit">Connect to IoT Platform</button>
        </form>
    </div>
</body>
</html>
)";
  server.send(200, "text/html", html);
}

void handleConfig() {
  strcpy(networkConfig.ssid, server.arg("ssid").c_str());
  strcpy(networkConfig.password, server.arg("password").c_str());
  strcpy(networkConfig.mqtt_server, server.arg("mqtt_server").c_str());
  strcpy(networkConfig.user_id, server.arg("user_id").c_str());
  strcpy(networkConfig.device_id, server.arg("device_id").c_str());
  
  saveConfig();
  
  server.send(200, "text/html", R"(
<html><body style="font-family:Arial;text-align:center;margin:50px;">
<h2>✅ Configuration Saved!</h2>
<p>Your Grow Box is connecting to the IoT Platform...</p>
<p>The device will restart in 3 seconds.</p>
<script>setTimeout(function(){window.close();}, 3000);</script>
</body></html>
)");
  
  delay(3000);
  ESP.restart();
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(networkConfig.ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(networkConfig.ssid, networkConfig.password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
  }
}

void connectToMQTT() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    String clientId = "ESP32-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      
      // Subscribe to command topic
      String commandTopic = "grow/" + String(networkConfig.user_id) + "/" + String(networkConfig.device_id) + "/command";
      client.subscribe(commandTopic.c_str());
      
      // Publish online status
      String statusTopic = "grow/" + String(networkConfig.user_id) + "/" + String(networkConfig.device_id) + "/status";
      client.publish(statusTopic.c_str(), "online", true);
      
      Serial.println("MQTT subscriptions active");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  StaticJsonDocument<200> doc;
  deserializeJson(doc, payload, length);
  
  // Process commands
  if (doc["command"] == "water_pump") {
    deviceState.waterPump = doc["value"];
    digitalWrite(WATER_PUMP_PIN, deviceState.waterPump ? HIGH : LOW);
    Serial.println("Water pump: " + String(deviceState.waterPump ? "ON" : "OFF"));
  }
  else if (doc["command"] == "light_system") {
    deviceState.lightSystem = doc["value"];
    analogWrite(LED_STRIP_PIN, deviceState.lightSystem ? (deviceState.lightIntensity * 255 / 100) : 0);
    Serial.println("Light system: " + String(deviceState.lightSystem ? "ON" : "OFF"));
  }
  else if (doc["command"] == "ventilation") {
    deviceState.ventilation = doc["value"];
    analogWrite(FAN_PIN, deviceState.ventilation ? (deviceState.fanSpeed * 255 / 100) : 0);
    Serial.println("Ventilation: " + String(deviceState.ventilation ? "ON" : "OFF"));
  }
  else if (doc["command"] == "heater") {
    deviceState.heater = doc["value"];
    digitalWrite(HEATER_PIN, deviceState.heater ? HIGH : LOW);
    Serial.println("Heater: " + String(deviceState.heater ? "ON" : "OFF"));
  }
  else if (doc["command"] == "light_intensity") {
    deviceState.lightIntensity = doc["value"];
    if (deviceState.lightSystem) {
      analogWrite(LED_STRIP_PIN, deviceState.lightIntensity * 255 / 100);
    }
    Serial.println("Light intensity: " + String(deviceState.lightIntensity) + "%");
  }
  else if (doc["command"] == "fan_speed") {
    deviceState.fanSpeed = doc["value"];
    if (deviceState.ventilation) {
      analogWrite(FAN_PIN, deviceState.fanSpeed * 255 / 100);
    }
    Serial.println("Fan speed: " + String(deviceState.fanSpeed) + "%");
  }
  
  // Send confirmation
  sendTelemetry();
}

void sendTelemetry() {
  if (!client.connected()) return;
  
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int soilMoisture = map(analogRead(SOIL_MOISTURE_PIN), 0, 4095, 0, 100);
  int lightLevel = map(analogRead(LIGHT_SENSOR_PIN), 0, 4095, 0, 100);
  
  StaticJsonDocument<300> doc;
  doc["device_id"] = networkConfig.device_id;
  doc["timestamp"] = millis();
  doc["temperature"] = isnan(temperature) ? 0 : temperature;
  doc["humidity"] = isnan(humidity) ? 0 : humidity;
  doc["soil_moisture"] = soilMoisture;
  doc["light_level"] = lightLevel;
  doc["controls"]["water_pump"] = deviceState.waterPump;
  doc["controls"]["light_system"] = deviceState.lightSystem;
  doc["controls"]["ventilation"] = deviceState.ventilation;
  doc["controls"]["heater"] = deviceState.heater;
  doc["controls"]["light_intensity"] = deviceState.lightIntensity;
  doc["controls"]["fan_speed"] = deviceState.fanSpeed;
  
  char jsonString[512];
  serializeJson(doc, jsonString);
  
  String telemetryTopic = "grow/" + String(networkConfig.user_id) + "/" + String(networkConfig.device_id) + "/telemetry";
  client.publish(telemetryTopic.c_str(), jsonString);
  
  Serial.println("Telemetry sent: T=" + String(temperature) + "°C, H=" + String(humidity) + "%");
}

void sendHeartbeat() {
  if (!client.connected()) return;
  
  String statusTopic = "grow/" + String(networkConfig.user_id) + "/" + String(networkConfig.device_id) + "/status";
  client.publish(statusTopic.c_str(), "online", true);
}

void updateStatusLED() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  
  unsigned long now = millis();
  
  if (WiFi.status() != WL_CONNECTED) {
    // Fast blink - no WiFi
    if (now - lastBlink > 200) {
      ledState = !ledState;
      digitalWrite(STATUS_LED_PIN, ledState);
      lastBlink = now;
    }
  } else if (!client.connected()) {
    // Slow blink - WiFi but no MQTT
    if (now - lastBlink > 1000) {
      ledState = !ledState;
      digitalWrite(STATUS_LED_PIN, ledState);
      lastBlink = now;
    }
  } else {
    // Solid on - all connected
    digitalWrite(STATUS_LED_PIN, HIGH);
  }
}

void setupOTA() {
  ArduinoOTA.setHostname(networkConfig.device_id);
  ArduinoOTA.setPassword("grow-ota-2024");
  
  ArduinoOTA.onStart([]() {
    String type = (ArduinoOTA.getCommand() == U_FLASH) ? "sketch" : "filesystem";
    Serial.println("Start updating " + type);
  });
  
  ArduinoOTA.onEnd([]() {
    Serial.println("\nEnd");
  });
  
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
  });
  
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
    else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
    else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
    else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
    else if (error == OTA_END_ERROR) Serial.println("End Failed");
  });
  
  ArduinoOTA.begin();
}

void saveConfig() {
  EEPROM.put(0, networkConfig);
  EEPROM.commit();
  Serial.println("Configuration saved to EEPROM");
}

void loadConfig() {
  EEPROM.get(0, networkConfig);
  
  // Check if configuration is valid
  if (networkConfig.ssid[0] == 0xFF) {
    // EEPROM is empty, initialize with default values
    memset(&networkConfig, 0, sizeof(networkConfig));
    strcpy(networkConfig.mqtt_server, "your-iot-platform.com");
    strcpy(networkConfig.device_id, "esp32-grow-001");
  }
  
  Serial.println("Configuration loaded from EEPROM");
}