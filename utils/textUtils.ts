import { marked } from 'marked';

/**
 * Cleans a Markdown string to make it suitable for text-to-speech.
 * It converts Markdown to HTML, then extracts the plain text content.
 * This removes syntax like '#', '*', '`', and link URLs.
 * @param markdown - The Markdown string to clean.
 * @returns A plain text string.
 */
export const cleanMarkdownForSpeech = (markdown: string): string => {
  try {
    if (!markdown) return '';
    const html = marked.parse(markdown, { gfm: true, breaks: true });
    
    // Using a DOM element to reliably strip HTML tags
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html as string;
    
    // Replace table headers with commas for better flow
    tempDiv.querySelectorAll('th').forEach(th => {
        const comma = document.createTextNode(', ');
        th.parentNode?.insertBefore(comma, th.nextSibling);
    });

    return tempDiv.textContent || tempDiv.innerText || '';
  } catch (error) {
    console.error("Error cleaning markdown for speech:", error);
    return markdown; // Fallback to the original text
  }
};
