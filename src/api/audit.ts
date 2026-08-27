import request from './request';
import type { AuditLogQuery, AuditLogItem, PageResult } from '../types';

export const auditApi = {
  /** 审计日志分页查询（仅 admin） */
  list: (params: AuditLogQuery) =>
    request.get<unknown, PageResult<AuditLogItem>>('/audit-logs', { params }),
};
