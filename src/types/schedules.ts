// Types matching actual DB schema for device_schedules table
export interface DeviceScheduleDB {
  id: string;
  device_id: string;
  name: string;
  action: any; // jsonb
  schedule_time: string; // time
  days_of_week: number[];
  enabled: boolean;
  created_at: string;
}

// Client-side interface for working with schedules
export interface DeviceSchedule {
  id: string;
  device_id: string;
  name: string;
  action: any;
  schedule_time: string;
  days_of_week: number[];
  enabled: boolean;
  created_at: string;
}
