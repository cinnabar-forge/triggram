export interface TriggerGroup {
  futureTrigger?: number;
  name: string;
  replies: string[];
  timeThresholdMax: number;
  timeThresholdMin: number;
  triggers: string[];
}

export interface Config {
  groups: TriggerGroup[];
  timeThresholdMax: number;
  timeThresholdMin: number;
}
