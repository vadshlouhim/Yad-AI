export interface TargetedCategoryDto {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface TargetedSettingsDto {
  isActive: boolean;
  displayName: string;
  logoUrl: string;
  title: string;
  introduction: string;
  primaryColor: string;
  accentColor: string;
}

export interface TargetedOccurrenceDto {
  id: string;
  scheduledFor: string;
  status: string;
  messageOverride: string | null;
  eventTimeOverride: string | null;
}

export interface TargetedAutomationDto {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  weekday: number;
  sendTime: string;
  eventTime: string | null;
  eventName: string | null;
  address: string | null;
  link: string | null;
  message: string;
  mode: "AUTO" | "CONFIRM";
  skipYomTov: boolean;
  skipHolHamoed: boolean;
  skipSchoolHolidays: boolean;
  schoolZone: "A" | "B" | "C";
  isActive: boolean;
  nextRunAt: string | null;
  lastError: string | null;
  occurrences: TargetedOccurrenceDto[];
}

export interface TargetedDashboardData {
  community: { name: string; slug: string; logoUrl: string | null; address: string | null; timezone: string };
  settings: TargetedSettingsDto;
  categories: TargetedCategoryDto[];
  automations: TargetedAutomationDto[];
}
