
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  queryParams: KeyValue[];
  bodyType: 'none' | 'json' | 'form-data';
  body: string;
  preScript: string;  // 前置脚本
  testScript: string; // 后置脚本/测试脚本
}

export interface ApiResponse {
  status: number;
  statusText: string;
  time: number; // in ms
  size: number; // in bytes
  headers: Record<string, string>;
  data: any;
  error?: string;
  rawBody: string;
  logs?: string[]; // 脚本执行日志
}

export interface BenchmarkResult {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  totalTime: number; // 总耗时
  avgTime: number;
  minTime: number;
  maxTime: number;
  qps: number;
  timeline: { id: number; time: number; status: number; latency: number }[]; // 用于绘图
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  request: ApiRequest;
  responseStatus?: number;
}

export type TabView = 'params' | 'headers' | 'body' | 'auth' | 'scripts' | 'benchmark';
export type ResponseTab = 'preview' | 'headers' | 'go-code' | 'ai-analysis' | 'benchmark-report';
