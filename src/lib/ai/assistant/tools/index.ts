import type { AssistantToolDef } from "../types";
import { eventTools } from "./events";
import { contactTools } from "./contacts";
import { contentTools } from "./content";
import { publicationTools } from "./publications";
import { automationTools } from "./automations";
import { settingsTools } from "./settings";
import { commsTools } from "./comms";
import { reviewTools } from "./reviews";
import { channelTools } from "./channels";
import { notificationTools } from "./notifications";
import { metaTools } from "./meta";

export const ALL_TOOL_DEFS: AssistantToolDef[] = [
  ...eventTools,
  ...contactTools,
  ...contentTools,
  ...publicationTools,
  ...automationTools,
  ...settingsTools,
  ...commsTools,
  ...reviewTools,
  ...channelTools,
  ...notificationTools,
  ...metaTools,
];
