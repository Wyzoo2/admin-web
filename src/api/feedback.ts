import request from './request';
import type { FeedbackItem, FeedbackListQuery, PageResult } from '../types';

export const feedbackApi = {
  /** 反馈管理列表（仅 admin，附提交人姓名/部门） */
  list: (params?: FeedbackListQuery) =>
    request.get<unknown, PageResult<FeedbackItem>>('/feedback/admin/all', {
      params,
    }),

  /** 回复反馈（回复即处理，状态自动置为 processed） */
  reply: (id: string, reply: string) =>
    request.put<unknown, FeedbackItem>(`/feedback/admin/${id}/reply`, {
      reply,
    }),
};
