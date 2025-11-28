
import { GoogleGenAI } from "@google/genai";
import { ApiRequest, ApiResponse } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const generateGoTestCode = async (request: ApiRequest): Promise<string> => {
  try {
    const ai = getAiClient();
    const headersStr = request.headers
      .filter(h => h.enabled && h.key)
      .map(h => `"${h.key}": "${h.value}"`)
      .join(', ');
    
    const paramsStr = request.queryParams
      .filter(p => p.enabled && p.key)
      .map(p => `${p.key}=${p.value}`)
      .join('&');

    const fullUrl = paramsStr ? `${request.url}?${paramsStr}` : request.url;

    const prompt = `
      你是一位资深的 Go (Golang) 开发者。
      请生成一个完整、可运行的 Go 源代码文件，使用 "net/http" 和 "testing" 包来测试以下 API 请求。
      
      请求详情:
      - 方法: ${request.method}
      - URL: ${fullUrl}
      - Headers: {${headersStr}}
      - Body: ${request.body || "nil"}
      
      要求:
      1. 创建一个名为 'TestAPI_${request.method}' 的测试函数。
      2. 使用 'http.NewRequest'。
      3. 正确设置所有请求头。
      4. 如果存在 Body，请处理 JSON marshaling。
      5. 在测试中检查状态码是否为 200 (或适当的成功代码)。
      6. 仅输出原始 Go 代码，不要使用 markdown 代码块包裹，也不要添加其他解释。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.replace(/```go/g, '').replace(/```/g, '').trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "// 生成 Go 代码时出错，请检查您的 API Key。";
  }
};

export const analyzeApiResponse = async (request: ApiRequest, response: ApiResponse): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `
      请分析此 API 响应并进行简要说明（请使用中文回答）。
      
      请求: ${request.method} ${request.url}
      响应状态: ${response.status}
      响应体 (片段): ${response.rawBody.substring(0, 1000)}...
      
      如果是错误 (4xx/5xx)，请解释可能的原因以及如何在 Go 中修复它。
      如果是成功，请描述返回的数据结构。
      使用 Markdown 格式。
    `;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return result.text;
  } catch (error) {
    return "暂时无法分析响应。";
  }
};
