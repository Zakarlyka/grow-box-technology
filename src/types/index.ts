/**
 * Type definitions matching the actual Supabase database schema
 */

// Device Settings (stored in devices.config jsonb column)
export interface DeviceSettings {
  target_temp?: number;
  temp_hyst?: number;
  target_hum?: number;
  hum_hyst?: number;
  is_ac_installed?: boolean;
  vent_work_minutes?: number;
  vent_pause_minutes?: number;
  min_soil_moisture?: number;
  max_soil_moisture?: number;
  irrigation_duration_sec?: number;
  irrigation_pause_min?: number;
  light_start_time?: string;
  light_end_time?: string;
}

// Device Control (device_controls table)
export interface DeviceControl {
  id: string;
  device_id: string;
  control_name: string;
  control_type: string;
  value: any; // jsonb - can be boolean, number, object, etc
  updated_at: string;
}

// Device (devices table)
export interface Device {
  id: string;
  user_id: string;
  device_id: string;
  name: string;
  type: string;
  status: string;
  config: any; // jsonb
  last_seen: string;
  created_at: string;
  updated_at: string;
}

// Sensor Data (sensor_data table)
export interface SensorData {
  id: string;
  device_id: string;
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  soil_moisture: number | null;
  light: number | null;
  ph: number | null;
  ec: number | null;
  co2: number | null;
  data: any; // jsonb
}

// Device Schedule (device_schedules table)
export interface DeviceSchedule {
  id: string;
  device_id: string;
  name: string;
  action: any; // jsonb
  schedule_time: string; // time
  days_of_week: number[];
  enabled: boolean;
  created_at: string;
}

// Notification Setting (notification_settings table)
export interface NotificationSetting {
  id: string;
  user_id: string;
  device_id: string | null;
  parameter: string;
  min_value: number | null;
  max_value: number | null;
  enabled: boolean;
  created_at: string;
  email_enabled?: boolean;
  push_enabled?: boolean;
}

// Profile (profiles table)
export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Strain (strains table)
export interface Strain {
  id: string;
  name: string;
  type: string;
  description: string | null;
  thc_content: string | null;
  cbd_content: string | null;
  flowering_time: string | null;
  yield_info: string | null;
  difficulty: string | null;
  effects: string[] | null;
  created_at: string;
}

// Article (articles table)
export interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  author_id: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

// User Role (user_roles table)
export interface UserRole {
  id: string;
  user_id: string;
  role: 'user' | 'developer' | 'admin' | 'superadmin';
  created_at: string;
}
