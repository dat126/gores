import React, { useState } from 'react';
import { Sidebar } from './components/Layout';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { ApiRequest, ApiResponse, TabView, ResponseTab, HistoryItem, BenchmarkResult } from './types';

const INITIAL_REQUEST: ApiRequest = {
  id: 'init',
  name: 'New Request',
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/posts/1',
  headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
  queryParams: [],
  bodyType: 'none',
  body: '',
  preScript: '',
  testScript: ''
};

const App: React.FC = () => {
  const [request, setRequest] = useState<ApiRequest>(INITIAL_REQUEST);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>('params');
  const [activeResponseTab, setActiveResponseTab] = useState<ResponseTab>('preview');
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sidebarView, setSidebarView] = useState<'history' | 'collections'>('history');

  // --- Sandbox Script Engine ---
  const executeScript = (scriptCode: string, context: { req: any, res?: any, logs: string[] }) => {
      if (!scriptCode.trim()) return;
      
      try {
          // Create a sandboxed console
          const sandboxConsole = {
              log: (...args: any[]) => context.logs.push(args.map(a => JSON.stringify(a)).join(' '))
          };

          // Safe wrapper
          const func = new Function('request', 'response', 'console', `
            try {
                ${scriptCode}
            } catch(e) {
                console.log("Script Error: " + e.message);
            }
          `);
          
          func(context.req, context.res, sandboxConsole);
      } catch (e: any) {
          context.logs.push(`System Error: ${e.message}`);
      }
  };

  const sendRequest = async () => {
    setLoading(true);
    setResponse(null);
    setBenchmarkResult(null);
    setActiveResponseTab('preview');
    
    const logs: string[] = [];
    const startTime = performance.now();
    
    try {
      // 1. Pre-request Script
      const reqContext = { ...request }; // Clone to allow modification in script
      executeScript(request.preScript, { req: reqContext, logs });

      // Prepare headers
      const headersObj: Record<string, string> = {};
      reqContext.headers.forEach(h => {
        if (h.enabled && h.key) headersObj[h.key] = h.value;
      });

      // Prepare URL
      const queryString = reqContext.queryParams
        .filter(p => p.enabled && p.key)
        .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&');
      
      const finalUrl = queryString ? `${reqContext.url}?${queryString}` : reqContext.url;

      // Prepare options
      const options: RequestInit = {
        method: reqContext.method,
        headers: headersObj,
      };

      if (reqContext.method !== 'GET' && reqContext.bodyType === 'json' && reqContext.body) {
         try {
             JSON.parse(reqContext.body); // Validate
             options.body = reqContext.body;
         } catch(e) {
             throw new Error("Invalid JSON body");
         }
      }

      // 2. Execute Request
      const res = await fetch(finalUrl, options);
      const endTime = performance.now();
      
      const size = res.headers.get('content-length') ? parseInt(res.headers.get('content-length')!) : 0;
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => resHeaders[key] = val);

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      const apiResponse: ApiResponse = {
        status: res.status,
        statusText: res.statusText || (res.status === 200 ? 'OK' : ''),
        time: Math.round(endTime - startTime),
        size: size || text.length,
        headers: resHeaders,
        data: data,
        rawBody: text,
        logs: logs
      };

      // 3. Post-request Script (Tests)
      executeScript(request.testScript, { req: reqContext, res: apiResponse, logs });

      setResponse(apiResponse);
      
      // Add to history
      setHistory(prev => [{
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        request: { ...request }, // Save original request state
        responseStatus: res.status
      }, ...prev].slice(0, 50));

    } catch (error: any) {
      const endTime = performance.now();
      logs.push(`Network Error: ${error.message}`);
      setResponse({
        status: 0,
        statusText: 'Error',
        time: Math.round(endTime - startTime),
        size: 0,
        headers: {},
        data: null,
        rawBody: error.message || 'Unknown error occurred.',
        logs: logs
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Benchmark Logic ---
  const runBenchmark = async (concurrency: number, loops: number) => {
      setLoading(true);
      setResponse(null);
      setActiveResponseTab('benchmark-report');

      // Setup simplified request (skipping scripts for perf)
      const headersObj: Record<string, string> = {};
      request.headers.forEach(h => { if (h.enabled && h.key) headersObj[h.key] = h.value; });
      const queryString = request.queryParams.filter(p => p.enabled && p.key).map(p => `${p.key}=${p.value}`).join('&');
      const finalUrl = queryString ? `${request.url}?${queryString}` : request.url;
      const options: RequestInit = { method: request.method, headers: headersObj };
      if (request.method !== 'GET' && request.bodyType === 'json') options.body = request.body;

      const results: {id: number, time: number, status: number, latency: number}[] = [];
      let completed = 0;
      const total = concurrency * loops;
      
      const startTimeTotal = performance.now();

      // Worker function to simulate a user
      const worker = async (userId: number) => {
          for(let i=0; i<loops; i++) {
              const start = performance.now();
              let status = 0;
              try {
                  const res = await fetch(finalUrl, options);
                  status = res.status;
                  await res.text(); // consume body
              } catch {
                  status = 0;
              }
              const end = performance.now();
              const latency = Math.round(end - start);
              
              results.push({
                  id: userId * loops + i,
                  time: Date.now(),
                  status,
                  latency
              });
              completed++;
          }
      };

      // Create chunks of workers
      const workers = Array(concurrency).fill(0).map((_, i) => worker(i));
      await Promise.all(workers);

      const endTimeTotal = performance.now();
      const totalTime = endTimeTotal - startTimeTotal;

      // Calculate stats
      const totalRequests = results.length;
      const successCount = results.filter(r => r.status >= 200 && r.status < 400).length;
      const latencies = results.map(r => r.latency);
      const avgTime = latencies.reduce((a,b) => a+b, 0) / totalRequests;
      const minTime = Math.min(...latencies);
      const maxTime = Math.max(...latencies);
      const qps = (totalRequests / (totalTime / 1000));

      setBenchmarkResult({
          totalRequests,
          successCount,
          errorCount: totalRequests - successCount,
          totalTime,
          avgTime,
          minTime,
          maxTime,
          qps,
          timeline: results.sort((a,b) => a.id - b.id) // Sort for chart
      });
      setLoading(false);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setRequest(item.request);
    setResponse(null);
    setBenchmarkResult(null);
    setActiveResponseTab('preview');
  };

  return (
    <div className="flex w-full h-screen bg-black text-gray-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        activeView={sidebarView}
        onHistoryClick={() => setSidebarView('history')}
        onCollectionsClick={() => setSidebarView('collections')}
      />

      {/* Sidebar Content (Drawer) */}
      <div className="w-64 bg-slate-950 border-r border-gray-800 flex flex-col hidden md:flex">
         <div className="p-4 border-b border-gray-800 font-semibold text-gray-400 uppercase text-xs tracking-wider">
             {sidebarView === 'history' ? '历史记录' : '集合'}
         </div>
         <div className="flex-1 overflow-y-auto">
            {sidebarView === 'history' && (
                <div className="flex flex-col">
                    {history.length === 0 && <div className="p-4 text-gray-600 text-sm">暂无记录</div>}
                    {history.map(item => (
                        <button 
                            key={item.id}
                            onClick={() => loadFromHistory(item)}
                            className="p-3 border-b border-gray-900 hover:bg-gray-900 text-left group transition-colors"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    item.request.method === 'GET' ? 'bg-green-500/10 text-green-500' :
                                    item.request.method === 'POST' ? 'bg-yellow-500/10 text-yellow-500' :
                                    item.request.method === 'DELETE' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                                }`}>
                                    {item.request.method}
                                </span>
                                <span className={`text-[10px] ${
                                    item.responseStatus && item.responseStatus >= 400 ? 'text-red-400' : 'text-green-400'
                                }`}>
                                    {item.responseStatus || 'ERR'}
                                </span>
                            </div>
                            <div className="text-xs text-gray-400 truncate w-full font-mono opacity-80 group-hover:opacity-100">
                                {item.request.url}
                            </div>
                        </button>
                    ))}
                </div>
            )}
            {sidebarView === 'collections' && (
                <div className="p-4 text-sm text-gray-500">
                    集合功能开发中...
                </div>
            )}
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        {/* Left: Request */}
        <div className="flex-1 h-1/2 md:h-full md:w-1/2 overflow-hidden">
          <RequestPanel 
            request={request}
            onRequestChange={setRequest}
            onSend={sendRequest}
            onRunBenchmark={runBenchmark}
            isLoading={loading}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>

        {/* Right: Response */}
        <div className="flex-1 h-1/2 md:h-full md:w-1/2 border-t md:border-t-0 md:border-l border-gray-800 overflow-hidden">
          <ResponsePanel 
            response={response}
            benchmarkResult={benchmarkResult}
            loading={loading}
            request={request}
            activeTab={activeResponseTab}
            setActiveTab={setActiveResponseTab}
          />
        </div>
      </div>
    </div>
  );
};

export default App;