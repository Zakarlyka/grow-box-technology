# IoT Platform - ESP32 Device Management

## Опис проєкту

Багатомовна IoT-платформа для підключення та керування ESP32-пристроями з веб-інтерфейсом у реальному часі.

## Реалізовані можливості

### Frontend (React + TypeScript)
- ✅ **Багатомовна підтримка** (українська, англійська, російська)  
- ✅ **Responsive дизайн** з темною tech-тематикою
- ✅ **PWA готовність** для мобільних пристроїв
- ✅ **Dashboard** з графіками телеметрії у реальному часі
- ✅ **Панель керування пристроями** з кнопками та слайдерами
- ✅ **Симуляція IoT даних** для демонстрації функціоналу

### Функціонал
- **Dashboard**: статистика пристроїв, графіки температури/вологості
- **Device Management**: керування ESP32 пристроями (помпи, освітлення, вентиляція, обігрівачі)
- **Real-time monitoring**: симуляція даних з датчиків
- **Responsive UI**: адаптивний дизайн для всіх пристроїв

## Технології

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Charts**: Recharts для візуалізації даних
- **Icons**: Lucide React
- **Internationalization**: react-i18next
- **Build**: Vite
- **UI Components**: shadcn/ui

## Швидкий старт

1. **Клонування репозиторію**
```bash
git clone <your-repo-url>
cd iot-platform
```

2. **Установка залежностей**
```bash
npm install
```

3. **Запуск у режимі розробки**
```bash
npm run dev
```

4. **Збірка для продакшн**
```bash
npm run build
```

## Підключення ESP8266/ESP32

### 1. Налаштування Wi-Fi порталу на ESP

Після підключення до Wi-Fi порталу ESP8266, виконайте POST-запит до `/setup` API:

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

const char* setupEndpoint = "https://ychnmaaximnoxvwnzrgs.supabase.co/functions/v1/setup";
const char* authToken = "YOUR_USER_JWT_TOKEN"; // Отримати після авторизації
const char* deviceKey = "YOUR_SECURE_KEY_MIN_16_CHARS"; // Мінімум 16 символів

void setupDevice() {
  WiFiClientSecure client;
  client.setInsecure(); // Для тестування, використовуйте сертифікати у продакшн
  
  HTTPClient http;
  http.begin(client, setupEndpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + authToken);
  
  StaticJsonDocument<256> doc;
  doc["device_id"] = "ESP-" + String(ESP.getChipId(), HEX);
  doc["key"] = deviceKey;
  doc["name"] = "My Grow Box";
  doc["type"] = "grow_box";
  doc["location"] = "Room 1";
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode == 201) {
    Serial.println("Device registered successfully!");
    // Зберегти device_id в EEPROM для наступних запитів
  } else if (httpCode == 200) {
    Serial.println("Device updated!");
  } else {
    Serial.printf("Setup failed: %d\n", httpCode);
    Serial.println(http.getString());
  }
  
  http.end();
}

void setup() {
  Serial.begin(115200);
  
  // Підключення до WiFi
  WiFi.begin("your-ssid", "your-password");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
  
  // Реєстрація пристрою
  setupDevice();
}
```

### 2. Отримання JWT токена

Для автентифікації запитів використовуйте JWT токен користувача:

1. Увійдіть у веб-додаток
2. У Developer Tools → Application → Local Storage знайдіть `sb-<project>-auth-token`
3. Використайте `access_token` для авторизації запитів з ESP

**Важливо:** У продакшн-режимі використовуйте безпечний спосіб зберігання токенів!

### 3. Генерація Device ID через QR-код

1. У Dashboard натисніть **"Підключити новий"**
2. Скануйте QR-код з ESP8266 Wi-Fi порталу
3. Або скопіюйте Device ID вручну
4. Пристрій автоматично з'явиться у списку після успішної реєстрації

### 4. Realtime оновлення статусу

Після реєстрації пристрою:
- ✅ Dashboard автоматично отримує нові пристрої через Supabase Realtime
- ✅ Статус `online`/`offline` оновлюється у реальному часі
- ✅ Показується час останньої активності

---

## Наступні кроки

### Backend інтеграція
Для повної функціональності потрібно підключити **Supabase**:

- ✅ **Authentication** (email/password)
- ✅ **PostgreSQL** для зберігання користувачів та налаштувань
- ✅ **Real-time subscriptions** для живих даних
- ✅ **Edge Functions** для реєстрації пристроїв (`/setup`)

### MQTT інтеграція
```javascript
// Приклад MQTT топіків
grow/<user_id>/<device_id>/telemetry  // пристрій → сервер  
grow/<user_id>/<device_id>/command    // сервер → пристрій
grow/<user_id>/<device_id>/status     // online/offline
```

### ESP32 прошивка (приклад)
```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi та MQTT конфігурація
const char* ssid = "your-wifi";
const char* password = "your-password";
const char* mqtt_server = "your-mqtt-broker.com";

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  
  // Підключення до WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  // Налаштування MQTT
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void callback(char* topic, byte* payload, unsigned int length) {
  // Обробка команд від сервера
  StaticJsonDocument<200> doc;
  deserializeJson(doc, payload, length);
  
  if (doc["command"] == "water_pump") {
    digitalWrite(WATER_PUMP_PIN, doc["value"]);
  }
  // ... інші команди
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Відправка телеметрії кожні 30 секунд
  static unsigned long lastMsg = 0;
  unsigned long now = millis();
  if (now - lastMsg > 30000) {
    lastMsg = now;
    sendTelemetry();
  }
}

void sendTelemetry() {
  StaticJsonDocument<200> doc;
  doc["temperature"] = 24.5;
  doc["humidity"] = 65;
  doc["soil_moisture"] = 72;
  doc["light_level"] = 85;
  doc["timestamp"] = millis();
  
  char jsonString[512];
  serializeJson(doc, jsonString);
  
  client.publish("grow/user123/device001/telemetry", jsonString);
}
```

## Структура проєкту

```
src/
├── components/           # React компоненти
│   ├── ui/              # Базові UI компоненти
│   ├── Header.tsx       # Заголовок з мовним перемикачем
│   ├── Navigation.tsx   # Бічна навігація
│   ├── Dashboard.tsx    # Головна панель
│   └── Devices.tsx      # Керування пристроями
├── i18n/               # Інтернаціоналізація
│   ├── locales/        # Переклади (uk, en, ru)
│   └── index.ts        # Конфігурація i18n
├── pages/              # Сторінки
└── lib/                # Утиліти

public/
└── manifest.json       # PWA маніфест
```

## Дизайн система

- **Кольори**: тьмно-синя/зелена техно-тематика
- **Акценти**: електричний синій (#2563eb) + зелений (#22c55e)
- **Градієнти**: використовуються для кнопок та карток
- **Анімації**: pulse-glow для онлайн статусів
- **Типографія**: сучасні шрифти з акцентом на читабельність

## Deployment

### Docker (рекомендовано)
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Vercel/Netlify
```bash
npm run build
# Завантажити dist/ папку
```

## 🔐 Безпека (Row-Level Security)

### Увімкнення RLS

Row-Level Security (RLS) вже налаштовано для всіх таблиць у проекті. Якщо ви створюєте нові таблиці або хочете перевірити поточні налаштування:

1. Відкрийте [Supabase Dashboard](https://supabase.com/dashboard)
2. Перейдіть до **Table Editor**
3. Виберіть таблицю (наприклад, `devices` або `device_logs`)
4. Перейдіть на вкладку **Policies**
5. Переконайтеся, що RLS увімкнено (зелена позначка "RLS enabled")

### Поточні RLS політики

#### Таблиця `devices`
- **"Users manage their devices"** (ALL) - Користувачі можуть керувати лише своїми пристроями
  - USING: `user_id = auth.uid()`
  - WITH CHECK: `user_id = auth.uid()`

#### Таблиця `device_logs`
- **"Users view their logs"** (ALL) - Користувачі бачать логи лише своїх пристроїв
  - USING: `device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())`
  - WITH CHECK: `device_id IN (SELECT id FROM devices WHERE user_id = auth.uid())`

### Edge Functions і автентифікація

Всі Edge Functions (`/setup`, `/device-api`) використовують `supabase.auth.getUser()` для перевірки автентифікації:

```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser(
  authHeader.replace('Bearer ', '')
);

if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Invalid authorization token' }),
    { status: 401 }
  );
}
```

Якщо JWT токен відсутній або недійсний, функція поверне **401 Unauthorized**.

## Ліцензія

MIT License - дивіться [LICENSE](LICENSE) для деталей.

## Контакти

Для питань та пропозицій створіть issue в цьому репозиторії.