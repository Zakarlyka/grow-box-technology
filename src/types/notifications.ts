// Types matching actual DB schema for notification_settings table
export interface NotificationSettingDB {
  id: string;
  user_id: string;
  device_id: string | null;
  parameter: string;
  min_value: number | null;
  max_value: number | null;
  enabled: boolean;
  created_at: string;
}

// Client-side interface
export interface NotificationSetting {
  id: string;
  user_id: string;
  device_id: string | null;
  parameter: string;
  min_value: number | null;
  max_value: number | null;
  enabled: boolean;
  created_at: string;
}
