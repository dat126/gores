
import React from 'react';
import { Play, Plus, Trash2, CheckCircle2, Zap, FileCode } from 'lucide-react';
import { ApiRequest, HttpMethod, KeyValue, TabView } from '../types';
import { TabButton } from './Layout';

interface RequestPanelProps {
  request: ApiRequest;
  onRequestChange: (req: ApiRequest) => void;
  onSend: () => void;
  onRunBenchmark: (concurrency: number, loops: number) => void;
  isLoading: boolean;
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const MethodColor = {
  GET: 'text-green-400',
  POST: 'text-yellow-400',
  PUT: 'text-blue-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
};

export const RequestPanel: React.FC<RequestPanelProps> = ({ 
  request, onRequestChange, onSend, onRunBenchmark, isLoading, activeTab, setActiveTab 
}) => {
  const [concurrency, setConcurrency] = React.useState(10);
  const [loops, setLoops] = React.useState(5);

  const handleKVChange = (
    type: 'headers' | 'queryParams', 
    id: string, 
    field: 'key' | 'value' | 'enabled', 
    value: string | boolean
  ) => {
    const newList = request[type].map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    onRequestChange({ ...request, [type]: newList });
  };

  const addKV = (type: 'headers' | 'queryParams') => {
    const newItem: KeyValue = { id: crypto.randomUUID(), key: '', value: '', enabled: true };
    onRequestChange({ ...request, [type]: [...request[type], newItem] });
  };

  const removeKV = (type: 'headers' | 'queryParams', id: string) => {
    onRequestChange({ ...request, [type]: request[type].filter(i => i.id !== id) });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-gray-800">
      {/* URL Bar */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex gap-2">
          <div className="relative group">
            <select 
              value={request.method}
              onChange={(e) => onRequestChange({ ...request, method: e.target.value as HttpMethod })}
              className={`h-10 pl-3 pr-8 bg-gray-800 border border-gray-700 rounded-lg text-sm font-bold appearance-none cursor-pointer outline-none focus:border-indigo-500 ${MethodColor[request.method]}`}
            >
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          
          <input
            type="text"
            value={request.url}
            onChange={(e) => onRequestChange({ ...request, url: e.target.value })}
            placeholder="https://api.example.com/v1/users"
            className="flex-1 h-10 px-4 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm focus:border-indigo-500 outline-none font-mono"
          />
          
          <button
            onClick={activeTab === 'benchmark' ? () => onRunBenchmark(concurrency, loops) : onSend}
            disabled={isLoading}
            className={`h-10 px-6 flex items-center gap-2 font-medium rounded-lg transition-all text-white ${
                activeTab === 'benchmark' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-indigo-600 hover:bg-indigo-500'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                activeTab === 'benchmark' ? <Zap className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />
            )}
            {activeTab === 'benchmark' ? '开始压测' : '发送'}
          </button>
        </div>
      </div>

      {/* Configuration Tabs */}
      <div className="flex px-4 pt-2 border-b border-gray-800 gap-2 overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === 'params'} onClick={() => setActiveTab('params')}>参数</TabButton>
        <TabButton active={activeTab === 'headers'} onClick={() => setActiveTab('headers')}>请求头</TabButton>
        <TabButton active={activeTab === 'body'} onClick={() => setActiveTab('body')}>请求体</TabButton>
        <TabButton active={activeTab === 'scripts'} onClick={() => setActiveTab('scripts')}>脚本</TabButton>
        <TabButton active={activeTab === 'benchmark'} onClick={() => setActiveTab('benchmark')}>
             <div className="flex items-center gap-1 text-purple-400"><Zap className="w-3 h-3" /> 压测</div>
        </TabButton>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'params' && (
          <KeyValueEditor 
            items={request.queryParams} 
            onChange={(id, f, v) => handleKVChange('queryParams', id, f, v)}
            onAdd={() => addKV('queryParams')}
            onRemove={(id) => removeKV('queryParams', id)}
            title="Query Params (查询参数)"
          />
        )}
        {activeTab === 'headers' && (
          <KeyValueEditor 
            items={request.headers} 
            onChange={(id, f, v) => handleKVChange('headers', id, f, v)}
            onAdd={() => addKV('headers')}
            onRemove={(id) => removeKV('headers', id)}
            title="HTTP Headers (请求头)"
          />
        )}
        {activeTab === 'body' && (
          <div className="h-full flex flex-col">
            <div className="flex gap-4 mb-4 text-xs text-gray-400">
              <label className="flex items-center gap-2 cursor-pointer hover:text-gray-200">
                <input type="radio" checked={request.bodyType === 'none'} onChange={() => onRequestChange({...request, bodyType: 'none'})} />
                无 (None)
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-gray-200">
                <input type="radio" checked={request.bodyType === 'json'} onChange={() => onRequestChange({...request, bodyType: 'json'})} />
                JSON
              </label>
            </div>
            {request.bodyType === 'json' && (
              <textarea
                value={request.body}
                onChange={(e) => onRequestChange({...request, body: e.target.value})}
                className="flex-1 bg-gray-950 p-4 font-mono text-sm text-gray-300 rounded-lg border border-gray-800 focus:border-indigo-500 outline-none resize-none"
                placeholder="{ \"key\": \"value\" }"
              />
            )}
            {request.bodyType === 'none' && (
              <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">此请求没有请求体</div>
            )}
          </div>
        )}
        {activeTab === 'scripts' && (
            <div className="h-full flex flex-col gap-4">
                <div className="flex-1 flex flex-col">
                    <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-2">
                        <FileCode className="w-3 h-3" /> 前置脚本 (Pre-request)
                    </div>
                    <textarea 
                        value={request.preScript || ''}
                        onChange={(e) => onRequestChange({...request, preScript: e.target.value})}
                        className="flex-1 bg-gray-950 p-3 font-mono text-xs text-gray-300 rounded border border-gray-800 focus:border-indigo-500 outline-none resize-none"
                        placeholder="// 在请求发送前执行的 JavaScript 代码&#10;// console.log('Starting request...');"
                    />
                </div>
                <div className="flex-1 flex flex-col">
                    <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" /> 后置脚本 (Tests)
                    </div>
                    <textarea 
                         value={request.testScript || ''}
                         onChange={(e) => onRequestChange({...request, testScript: e.target.value})}
                         className="flex-1 bg-gray-950 p-3 font-mono text-xs text-gray-300 rounded border border-gray-800 focus:border-indigo-500 outline-none resize-none"
                         placeholder="// 请求完成后执行的 JavaScript 代码&#10;// if (response.status === 200) console.log('Success');"
                    />
                </div>
            </div>
        )}
        {activeTab === 'benchmark' && (
            <div className="p-4">
                <div className="bg-gray-800/50 border border-purple-500/20 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-6 text-purple-400">
                        <Zap className="w-5 h-5" />
                        <h3 className="font-semibold text-lg">性能压测配置</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">并发数 (Virtual Users)</label>
                            <input 
                                type="number" 
                                min="1" max="100"
                                value={concurrency}
                                onChange={(e) => setConcurrency(parseInt(e.target.value))}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">模拟同时访问的用户数量 (建议 1-50)</p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">每用户循环次数 (Loops)</label>
                            <input 
                                type="number" 
                                min="1" max="1000"
                                value={loops}
                                onChange={(e) => setLoops(parseInt(e.target.value))}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">每个虚拟用户执行请求的次数</p>
                        </div>
                    </div>

                    <div className="mt-8 bg-purple-900/10 p-4 rounded border border-purple-500/20 text-xs text-gray-300">
                        <p className="font-bold mb-1 text-purple-400">注意：</p>
                        <p>由于这是一个浏览器端应用，并发测试实际上是使用 JavaScript 异步请求模拟的。受限于浏览器的网络线程限制，极高的并发可能会导致浏览器卡顿或请求排队。建议用于轻量级接口冒烟测试。</p>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (id: string, field: 'key' | 'value' | 'enabled', value: string | boolean) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  title: string;
}

const KeyValueEditor: React.FC<KeyValueEditorProps> = ({ items, onChange, onAdd, onRemove, title }) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">{title}</h3>
      <button onClick={onAdd} className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
        <Plus className="w-3 h-3" /> 添加
      </button>
    </div>
    {items.length === 0 && <div className="text-sm text-gray-600 italic">未配置 {title}。</div>}
    {items.map((item) => (
      <div key={item.id} className="flex gap-2 group">
        <div className="flex items-center">
            <input 
                type="checkbox" 
                checked={item.enabled} 
                onChange={(e) => onChange(item.id, 'enabled', e.target.checked)}
                className="rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-offset-gray-900" 
            />
        </div>
        <input
          type="text"
          value={item.key}
          onChange={(e) => onChange(item.id, 'key', e.target.value)}
          placeholder="Key"
          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:border-indigo-500 outline-none"
        />
        <input
          type="text"
          value={item.value}
          onChange={(e) => onChange(item.id, 'value', e.target.value)}
          placeholder="Value"
          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:border-indigo-500 outline-none"
        />
        <button onClick={() => onRemove(item.id)} className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ))}
  </div>
);
