import { GoogleGenAI, Type } from "@google/genai";
import type { MindMapData } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a build-time check, but we also check at runtime.
  console.error("API_KEY is not set. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const generateContent = async (prompt: string): Promise<string> => {
    if (!API_KEY) {
        throw new Error("Error: API_KEY is not configured.");
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating content:", error);
        throw new Error("An error occurred while communicating with the AI. Please check the console for details.");
    }
};

export const askAI = (customPrompt: string, contextText: string): Promise<string> => {
  const prompt = `Based on the following text, perform the requested action.
  
  CONTEXT:
  ---
  ${contextText}
  ---
  
  REQUEST: "${customPrompt}"
  
  Provide only the direct result of the request, without any extra commentary or conversational filler.`;
  return generateContent(prompt);
};

export const summarizeText = (text: string): Promise<string> => {
  const prompt = `Summarize the following text into the most important key points. Format the output as a concise Markdown bulleted list. Only provide the summary.:\n\n"${text}"`;
  return generateContent(prompt);
};

export const continueWriting = (text: string): Promise<string> => {
  const prompt = `Continue writing from the following text, maintaining the same style, tone, and format. Add a logical continuation, such as the next paragraph or a concluding thought. Only provide the new text to be appended.:\n\n"${text}"`;
  return generateContent(prompt);
};


export const improveWriting = (text: string): Promise<string> => {
  const prompt = `Rewrite the following text to improve its clarity, grammar, and flow. Preserve the original Markdown formatting and structure where appropriate. Make it more engaging and professional. Only provide the improved text without any commentary.:\n\n"${text}"`;
  return generateContent(prompt);
};

export const fixGrammar = (text: string): Promise<string> => {
    const prompt = `Correct any spelling mistakes and grammatical errors in the following text. Preserve the original Markdown formatting. Only provide the corrected text without any commentary.:\n\n"${text}"`;
    return generateContent(prompt);
};

export const generateActionItems = (text: string): Promise<string> => {
  const prompt = `Analyze the following text and extract any potential action items or tasks. Format the output as a Markdown checklist. If no specific action items are found, state that. Only provide the list of action items.:\n\n"${text}"`;
  // Example output:
  // - [ ] Follow up with the design team about the new mockups.
  // - [ ] Schedule a meeting to review the quarterly budget.
  return generateContent(prompt);
};

export const brainstormIdeas = (text: string): Promise<string> => {
  const prompt = `Brainstorm a list of ideas, topics, or next steps related to the following text. The goal is to expand upon the core concepts. Format the output as a Markdown bulleted list. Only provide the brainstormed list.:\n\n"${text}"`;
  return generateContent(prompt);
};

export const generateTitle = (text: string): Promise<string> => {
  const prompt = `Based on the following content, generate a short, compelling title (5 words or less). Do not add quotes or labels, just the title itself.:\n\n"${text}"`;
  return generateContent(prompt);
};

export const generateDatabase = async (description: string): Promise<string> => {
  if (!API_KEY) {
      throw new Error("Error: API_KEY is not configured.");
  }
  try {
      const prompt = `Based on the following description, design a database table. Provide a list of relevant column headers and 2-3 diverse example rows of data.
      
      Description: "${description}"`;

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      columns: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "A list of column headers for the table."
                      },
                      exampleRows: {
                          type: Type.ARRAY,
                          items: { 
                              type: Type.ARRAY,
                              items: { type: Type.STRING }
                          },
                          description: "An array of arrays, where each inner array represents a row of example data."
                      }
                  },
                  required: ["columns", "exampleRows"]
              },
          },
      });
      
      const resultJson = JSON.parse(response.text);
      const { columns, exampleRows } = resultJson;

      if (!columns || columns.length === 0) {
          return `| New Table |\n|---|`;
      }

      const header = `| ${columns.join(' | ')} |`;
      const separator = `| ${columns.map(() => '---').join(' | ')} |`;
      const rows = exampleRows.map((row: string[]) => `| ${row.join(' | ')} |`).join('\n');

      return [header, separator, rows].join('\n');

  } catch (error) {
      console.error("Error generating database:", error);
      throw new Error("An error occurred while generating the database. Please check the console for details.");
  }
};

export const generateDynamicNote = async (topic: string): Promise<{ content: string; sources: {uri: string, title: string}[] }> => {
  if (!API_KEY) {
      throw new Error("Error: API_KEY is not configured.");
  }
  try {
      const prompt = `Generate a comprehensive, well-structured note on the following topic: "${topic}".
      
      Use clear headings, subheadings, bullet points, and bold text to organize the information effectively. The tone should be informative and authoritative.
      
      Ensure the output is entirely in Markdown format. Do not include any introductory or concluding remarks outside of the note content itself.`;

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            tools: [{googleSearch: {}}],
          },
      });
      
      const content = response.text;
      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      const sources = rawChunks
        .map(chunk => ({
          uri: chunk.web?.uri || '',
          title: chunk.web?.title || '',
        }))
        .filter(source => source.uri && source.title)
        // Simple deduplication
        .filter((source, index, self) => 
            index === self.findIndex((s) => s.uri === source.uri)
        );

      return { content, sources };

  } catch (error) {
      console.error("Error generating dynamic note:", error);
      throw new Error("An error occurred while generating the note. Please check the console for details.");
  }
};

export const generateImageNote = async (prompt: string): Promise<string> => {
  if (!API_KEY) {
      throw new Error("Error: API_KEY is not configured.");
  }
  try {
      const response = await ai.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt: prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '16:9',
          },
      });
  
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
  } catch (error) {
      console.error("Error generating image note:", error);
      throw new Error("An error occurred while generating the image. This can happen with complex prompts or during high demand. Please try a different prompt or wait a few minutes.");
  }
};

export const generateMindMap = async (noteContent: string): Promise<MindMapData> => {
  if (!API_KEY) {
    throw new Error("Error: API_KEY is not configured.");
  }
  try {
    const prompt = `Analyze the following note content and generate a hierarchical mind map structure. Identify the main central topic and the key concepts that branch off from it. Go one level deeper for sub-topics if possible. The labels should be concise.

    Note Content:
    ---
    ${noteContent}
    ---
    
    Generate the mind map structure based on the content provided.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            centralTopic: {
              type: Type.STRING,
              description: "The single, main subject of the entire note.",
            },
            nodes: {
              type: Type.ARRAY,
              description: "An array of main ideas that branch directly from the central topic.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "A unique identifier for the node." },
                  label: { type: Type.STRING, description: "A concise label for this idea." },
                  children: {
                    type: Type.ARRAY,
                    description: "An array of sub-ideas related to this main idea.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING, description: "A unique identifier for the sub-node." },
                        label: { type: Type.STRING, description: "A concise label for this sub-idea." },
                      },
                      required: ["id", "label"],
                    },
                  },
                },
                required: ["id", "label"],
              },
            },
          },
          required: ["centralTopic", "nodes"],
        },
      },
    });

    return JSON.parse(response.text);

  } catch (error) {
    console.error("Error generating mind map:", error);
    throw new Error("The AI failed to generate a mind map. The note might be too short or complex. Please try again.");
  }
};