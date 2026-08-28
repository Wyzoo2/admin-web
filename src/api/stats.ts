import request from './request';
import type { StatsOverview } from '../types';

export const statsApi = {
  /** Dashboard 汇总指标（仅 admin） */
  overview: () => request.get<unknown, StatsOverview>('/stats/overview'),
};
