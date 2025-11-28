
import React, { useState, useEffect } from 'react';
import { ApiRequest, ApiResponse, BenchmarkResult, ResponseTab } from '../types';
import { TabButton } from './Layout';
import { Bot, Code2, Copy, FileJson, Clock, Database, Check, AlertTriangle, Activity, Terminal } from 'lucide-react';
import { generateGoTestCode, analyzeApiResponse } from '../services/geminiService';

interface ResponsePanelProps {
  response: ApiResponse | null;
  benchmarkResult: BenchmarkResult | null;
  request: ApiRequest; // Needed for context in Go generation
  loading: boolean;
  activeTab: ResponseTab;
  setActiveTab: (tab: ResponseTab) => void;
}

export const ResponsePanel: React.FC<ResponsePanelProps> = ({ 
    response, benchmarkResult, request, loading, activeTab, setActiveTab 
}) => {
  const [goCode, setGoCode] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Generate Go code when switching to that tab
  useEffect(() => {
    if (activeTab === 'go-code' && !goCode && request) {
      setGeneratingCode(true);
      generateGoTestCode(request).then(code => {
        setGoCode(code);
        setGeneratingCode(false);
      });
    }
    
    if (activeTab === 'ai-analysis' && !aiAnalysis && response) {
      setAnalyzing(true);
      analyzeApiResponse(request, response).then(text => {
        setAiAnalysis(text);
        setAnalyzing(false);
      });
    }
  }, [activeTab, request, response, goCode, aiAnalysis]);

  // Reset derived state when request changes significantly (simplified check)
  useEffect(() => {
      setGoCode('');
      setAiAnalysis('');
  }, [request.url, request.method, response]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="animate-pulse">正在发送请求...</p>
      </div>
    );
  }

  // Handle Benchmark Result View
  if (activeTab === 'benchmark-report' && benchmarkResult) {
      return (
          <div className="h-full flex flex-col bg-slate-900">
              <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50 flex items-center gap-2 text-purple-400">
                   <Activity className="w-5 h-5" />
                   <span className="font-bold">性能测试报告</span>
              </div>
              <div className="flex px-4 pt-2 border-b border-gray-800 gap-2">
                 <TabButton active={true} onClick={() => {}}>概览图表</TabButton>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <StatCard label="总请求数" value={benchmarkResult.totalRequests} color="text-white" />
                      <StatCard label="成功率" value={`${((benchmarkResult.successCount/benchmarkResult.totalRequests)*100).toFixed(1)}%`} color="text-green-400" />
                      <StatCard label="QPS" value={benchmarkResult.qps.toFixed(2)} color="text-purple-400" />
                      <StatCard label="平均耗时" value={`${Math.round(benchmarkResult.avgTime)}ms`} color="text-yellow-400" />
                  </div>
                  
                  {/* Latency Chart */}
                  <div className="bg-gray-800/30 border border-gray-800 p-4 rounded-lg mb-4">
                      <h4 className="text-xs text-gray-400 mb-4 font-semibold uppercase tracking-wider">响应时间趋势图 (Latency)</h4>
                      <SimpleLineChart data={benchmarkResult.timeline} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/30 border border-gray-800 p-4 rounded-lg">
                            <h4 className="text-xs text-gray-400 mb-2">最小耗时</h4>
                            <div className="text-xl font-mono text-green-400">{benchmarkResult.minTime} ms</div>
                        </div>
                         <div className="bg-gray-800/30 border border-gray-800 p-4 rounded-lg">
                            <h4 className="text-xs text-gray-400 mb-2">最大耗时</h4>
                            <div className="text-xl font-mono text-red-400">{benchmarkResult.maxTime} ms</div>
                        </div>
                  </div>
              </div>
          </div>
      )
  }

  if (!response) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-slate-900 p-8 text-center">
        <div className="mb-4 bg-gray-800 p-4 rounded-full">
            <Bot className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-xl font-medium text-gray-300 mb-2">准备就绪</h3>
        <p className="max-w-xs text-sm">输入 URL 并点击发送。使用“Go 代码”选项卡可生成 'net/http' 测试脚本。</p>
      </div>
    );
  }

  const isError = response.status >= 400;

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Status Bar */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${isError ? 'text-red-500' : 'text-green-500'}`}>
              {response.status} {response.statusText}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{response.time} ms</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Database className="w-3 h-3" />
            <span>{response.size} B</span>
          </div>
        </div>
        <button 
            className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
            onClick={() => {navigator.clipboard.writeText(JSON.stringify(response.data, null, 2))}}
        >
            <Copy className="w-3 h-3" /> 复制
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-2 border-b border-gray-800 gap-2 overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>预览</TabButton>
        <TabButton active={activeTab === 'headers'} onClick={() => setActiveTab('headers')}>Header</TabButton>
        <TabButton active={activeTab === 'go-code'} onClick={() => setActiveTab('go-code')}>
             <div className="flex items-center gap-2"><Code2 className="w-4 h-4" /> Go 代码</div>
        </TabButton>
        <TabButton active={activeTab === 'ai-analysis'} onClick={() => setActiveTab('ai-analysis')}>
             <div className="flex items-center gap-2"><Bot className="w-4 h-4" /> AI 分析</div>
        </TabButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 relative">
        {activeTab === 'preview' && (
          <div className="flex flex-col gap-4">
              <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap break-all leading-relaxed">
                {typeof response.data === 'object' 
                ? JSON.stringify(response.data, null, 2) 
                : response.rawBody}
             </pre>
             {response.logs && response.logs.length > 0 && (
                 <div className="border-t border-gray-800 pt-4 mt-2">
                     <div className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                         <Terminal className="w-3 h-3" /> 脚本日志
                     </div>
                     <div className="bg-black/30 p-2 rounded text-xs font-mono text-gray-400 max-h-32 overflow-y-auto">
                         {response.logs.map((log, i) => <div key={i}>{log}</div>)}
                     </div>
                 </div>
             )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {Object.entries(response.headers).map(([key, value]) => (
              <React.Fragment key={key}>
                <div className="font-medium text-gray-400 text-right">{key}:</div>
                <div className="text-gray-200 font-mono break-all">{value}</div>
              </React.Fragment>
            ))}
          </div>
        )}

        {activeTab === 'go-code' && (
          <div className="relative h-full">
            {generatingCode ? (
               <div className="flex flex-col items-center justify-center h-full text-gray-400">
                 <Bot className="w-8 h-8 animate-bounce mb-2 text-indigo-400" />
                 <p>正在生成 Go 测试用例...</p>
               </div>
            ) : (
                <>
                    <div className="absolute top-0 right-0 p-2">
                         <button 
                            onClick={() => navigator.clipboard.writeText(goCode)}
                            className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded border border-gray-600 transition-colors"
                        >
                            复制代码
                        </button>
                    </div>
                    <pre className="font-mono text-sm text-blue-300 whitespace-pre-wrap p-4 bg-gray-950 rounded border border-gray-800">
                        {goCode}
                    </pre>
                </>
            )}
          </div>
        )}

        {activeTab === 'ai-analysis' && (
          <div className="h-full">
             {analyzing ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Bot className="w-8 h-8 animate-pulse mb-2 text-indigo-400" />
                  <p>Gemini 正在分析响应...</p>
                </div>
             ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                     <div className="flex items-center gap-2 mb-4 text-indigo-400 font-semibold border-b border-gray-700 pb-2">
                        <Bot className="w-5 h-5" /> 
                        Gemini 智能分析
                     </div>
                     <div className="whitespace-pre-wrap text-gray-300 font-sans leading-relaxed">
                        {aiAnalysis}
                     </div>
                  </div>
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Sub Components ---

const StatCard = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
    <div className="bg-gray-800 rounded p-3 border border-gray-700">
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
);

// A simple SVG Line Chart to avoid heavy dependencies
const SimpleLineChart = ({ data }: { data: { id: number, time: number, status: number, latency: number }[] }) => {
    if (data.length < 2) return <div className="text-center text-gray-500 py-10">数据不足，无法绘图</div>;

    const width = 600;
    const height = 200;
    const padding = 20;

    const maxLatency = Math.max(...data.map(d => d.latency));
    const minLatency = 0;
    
    // Scale functions
    const xScale = (index: number) => padding + (index / (data.length - 1)) * (width - padding * 2);
    const yScale = (val: number) => height - padding - ((val - minLatency) / (maxLatency - minLatency || 1)) * (height - padding * 2);

    const points = data.map((d, i) => `${xScale(i)},${yScale(d.latency)}`).join(' ');

    return (
        <div className="w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
                {/* Axes */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" strokeWidth="1" />
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" strokeWidth="1" />
                
                {/* Line */}
                <polyline 
                    fill="none" 
                    stroke="#818cf8" 
                    strokeWidth="2" 
                    points={points} 
                    strokeLinejoin="round" 
                />

                {/* Avg Line */}
                {/* <line x1={padding} y1={yScale(avg)} x2={width-padding} y2={yScale(avg)} stroke="#fbbf24" strokeDasharray="4" /> */}
            </svg>
            <div className="flex justify-between text-xs text-gray-500 px-2 mt-1">
                <span>请求 #1</span>
                <span>请求 #{data.length}</span>
            </div>
        </div>
    )
}
