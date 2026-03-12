import { GoogleGenAI, Type } from "@google/genai";
import JSZip from "jszip";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

export interface Finding {
  no: string;
  problem: string;
  category: string;
  area: string;
  pic: string;
  rootCause: string;
  action: string;
  dueDate: string;
}

export interface DashboardData {
  summary: string;
  suggestions: string;
  chartData: {
    categoryDistribution: { name: string; value: number }[];
    areaDistribution: { name: string; value: number }[];
    picDistribution: { name: string; value: number }[];
  };
}

function extractJSONObjects(text: string): any[] {
  const results: any[] = [];
  
  // 1. Try to parse the whole thing first (after basic sanitization)
  let sanitized = text.replace(/[\x00-\x1F\x7F-\x9F]/g, " ");
  try {
    const parsed = JSON.parse(sanitized);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // Ignore and proceed to manual extraction
  }

  // 2. Manual extraction of objects
  let depth = 0;
  let inString = false;
  let escape = false;
  let currentObj = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (escape) {
      escape = false;
      if (depth > 0) currentObj += char;
      continue;
    }

    if (char === '\\') {
      escape = true;
      if (depth > 0) currentObj += char;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      if (depth > 0) currentObj += char;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        depth++;
        if (depth === 1) {
          currentObj = "{";
          continue;
        }
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          currentObj += "}";
          try {
            let cleanObj = currentObj.replace(/[\x00-\x1F\x7F-\x9F]/g, " ");
            results.push(JSON.parse(cleanObj));
          } catch (err) {
            console.warn("Failed to parse extracted object:", cleanObj);
          }
          currentObj = "";
          continue;
        }
      }
    }

    if (depth > 0) {
      currentObj += char;
    }
  }

  // 3. Try to salvage the last truncated object
  if (depth > 0 && currentObj.length > 0) {
    try {
      let salvage = currentObj;
      if (inString) salvage += '"';
      // Close all open objects
      for (let i = 0; i < depth; i++) {
        salvage += '}';
      }
      let cleanObj = salvage.replace(/[\x00-\x1F\x7F-\x9F]/g, " ");
      results.push(JSON.parse(cleanObj));
    } catch (err) {
      console.warn("Failed to salvage truncated object:", currentObj);
    }
  }

  return results;
}

export async function askChatbot(question: string, findings: Finding[], history: {role: 'user'|'model', text: string}[]): Promise<string> {
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));
  
  contents.push({
    role: 'user',
    parts: [{ text: `Context data (Audit Findings):\n${JSON.stringify(findings)}\n\nQuestion: ${question}` }]
  });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contents,
    config: {
      systemInstruction: "You are a helpful AI assistant analyzing audit findings. Answer the user's questions based ONLY on the provided context data. If the answer is not in the data, say so. Keep answers concise, analytical, and helpful. Respond in the same language as the user's question (e.g., Indonesian if asked in Indonesian).",
    }
  });

  return response.text || "Maaf, saya tidak dapat menghasilkan respons saat ini.";
}

async function extractContentFromPPTX(file: File) {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  
  let text = '';
  const images: { data: string, mimeType: string }[] = [];

  // Extract text from slides
  const slideFiles = Object.keys(loadedZip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
  for (const slideFile of slideFiles) {
    const content = await loadedZip.files[slideFile].async('text');
    // Simple regex to extract text from XML nodes like <a:t>Some text</a:t>
    const matches = content.match(/<a:t.*?>(.*?)<\/a:t>/g);
    if (matches) {
      const slideText = matches.map(m => m.replace(/<a:t.*?>/, '').replace(/<\/a:t>/, '')).join(' ');
      text += slideText + '\n';
    }
  }

  // Extract images
  const mediaFiles = Object.keys(loadedZip.files).filter(name => name.startsWith('ppt/media/'));
  for (const mediaFile of mediaFiles) {
    const extension = mediaFile.split('.').pop()?.toLowerCase();
    let mimeType = '';
    if (extension === 'png') mimeType = 'image/png';
    else if (extension === 'jpeg' || extension === 'jpg') mimeType = 'image/jpeg';
    else if (extension === 'gif') mimeType = 'image/gif';
    
    if (mimeType) {
      const base64Data = await loadedZip.files[mediaFile].async('base64');
      images.push({ data: base64Data, mimeType });
    }
  }

  return { text, images };
}

export async function extractFindingsFromFiles(files: File[]): Promise<Finding[]> {
  const allFindings: Finding[] = [];

  for (const file of files) {
    const mimeType = file.type;

    try {
      const parts: any[] = [];

      if (mimeType === 'application/pdf' || file.name.endsWith('.pdf')) {
        const base64Data = await fileToBase64(file);
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: 'application/pdf',
          },
        });
        parts.push({
          text: "Extract the audit finding table data from this document. The table has headers: No., Problem, Category, Area, PIC, Root Cause, Action, Due Date. Return the data as a JSON array of objects. Ignore rows where the Problem column is empty. If there are no findings, return an empty array.",
        });
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || file.name.endsWith('.pptx')) {
        const { text, images } = await extractContentFromPPTX(file);
        
        for (const img of images) {
          parts.push({
            inlineData: {
              data: img.data,
              mimeType: img.mimeType
            }
          });
        }
        
        parts.push({
          text: `Here is the text extracted from the presentation:\n${text}\n\nExtract the audit finding table data from this document and its images. The table has headers: No., Problem, Category, Area, PIC, Root Cause, Action, Due Date. Return the data as a JSON array of objects. Ignore rows where the Problem column is empty. If there are no findings, return an empty array.`
        });
      } else {
        throw new Error(`Unsupported file type: ${mimeType || file.name}. Please upload PDF or PPTX files.`);
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                no: { type: Type.STRING },
                problem: { type: Type.STRING },
                category: { type: Type.STRING },
                area: { type: Type.STRING },
                pic: { type: Type.STRING },
                rootCause: { type: Type.STRING },
                action: { type: Type.STRING },
                dueDate: { type: Type.STRING },
              },
            },
          },
        },
      });

      const jsonStr = response.text?.trim() || "[]";
      
      try {
        const parsed = extractJSONObjects(jsonStr);
        if (parsed.length === 0 && jsonStr.length > 20) {
          console.error("Raw AI Output:", jsonStr);
          throw new Error("Could not extract any valid data from the AI response.");
        }
        allFindings.push(...parsed);
      } catch (e: any) {
        console.error("Failed to parse JSON for file", file.name, e);
        throw new Error(`Failed to process "${file.name}": The document contains complex formatting that caused the AI to generate invalid data.`);
      }
    } catch (e: any) {
      console.error("Failed to extract findings from file", file.name, e);
      throw new Error(`Failed to process "${file.name}": ${e.message}`);
    }
  }

  // Filter out findings where the problem is empty or just whitespace
  return allFindings.filter(f => f.problem && f.problem.trim() !== '');
}

export async function generateDashboardData(findings: Finding[]): Promise<DashboardData> {
  // 1. Calculate chart data locally (Super fast, no LLM needed)
  const categoryCount: Record<string, number> = {};
  const areaCount: Record<string, number> = {};
  const picCount: Record<string, number> = {};

  findings.forEach(f => {
    const cat = f.category || 'Unknown';
    const area = f.area || 'Unknown';
    const pic = f.pic || 'Unknown';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    areaCount[area] = (areaCount[area] || 0) + 1;
    picCount[pic] = (picCount[pic] || 0) + 1;
  });

  const chartData = {
    categoryDistribution: Object.entries(categoryCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10),
    areaDistribution: Object.entries(areaCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10),
    picDistribution: Object.entries(picCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10),
  };

  // 2. Ask LLM ONLY for simple summary and suggestions based on aggregated data
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          text: `Analyze this audit data summary and provide a VERY SHORT and SIMPLE summary, and brief actionable insights. Keep it concise to generate quickly.
          
Total Findings: ${findings.length}
Top Categories: ${JSON.stringify(chartData.categoryDistribution)}
Top Areas: ${JSON.stringify(chartData.areaDistribution)}
Top PICs: ${JSON.stringify(chartData.picDistribution)}
`,
        },
      ],
    },
    config: {
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "A short, simple summary of the findings (max 2 paragraphs)." },
          suggestions: { type: Type.STRING, description: "Short, bulleted actionable insights." },
        },
        required: ["summary", "suggestions"],
      },
    },
  });

  let jsonStr = response.text?.trim() || "{}";
  
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```/, "").replace(/```$/, "").trim();
  }

  let inString = false;
  let escape = false;
  let sanitizedJson = "";
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (escape) {
      escape = false;
      sanitizedJson += char;
      continue;
    }
    if (char === '\\') {
      escape = true;
      sanitizedJson += char;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      sanitizedJson += char;
      continue;
    }
    if (inString && (char === '\n' || char === '\r')) {
      sanitizedJson += char === '\n' ? '\\n' : '\\r';
      continue;
    }
    if (inString && char === '\t') {
      sanitizedJson += '\\t';
      continue;
    }
    sanitizedJson += char;
  }

  // If the string was truncated, close the quote
  if (inString) {
    sanitizedJson += '"';
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(sanitizedJson);
  } catch (e: any) {
    // Attempt to salvage truncated JSON by closing the object
    try {
      parsed = JSON.parse(sanitizedJson + "}");
    } catch (e2) {
      try {
        parsed = JSON.parse(sanitizedJson + '"}');
      } catch (e3) {
        console.error("Failed to parse JSON", e);
        console.error("Raw JSON string:", sanitizedJson);
        return { summary: "Failed to generate summary.", suggestions: "Failed to generate insights.", chartData };
      }
    }
  }

  return {
    summary: parsed?.summary || "No summary generated.",
    suggestions: parsed?.suggestions || "No insights generated.",
    chartData
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}
