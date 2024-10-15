import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { json } from 'stream/consumers'

const model = 'qwen:latest'
const prompt = `Please generate a project based on the following description: "A basic web application with a login page and dashboard."

Return the project structure in the following JSON format without any other words:
<PROJECT>
{
  "project_name": "Project Name",
  "description": "Brief description of the project",
  "files": [
    {
      "path": "src/index.html",
      "content": "HTML content for the main page"
    },
    {
      "path": "src/styles.css",
      "content": "CSS content for styling"
    }
  ]
}
</PROJECT>
`
const url = 'http://localhost:11434/api/generate' // 修复多余的冒号
const header = {
  'Content-Type': 'application/json'
}

// 调用 Ollama 模型
export async function generateProjectWithOllama() {
  try {
    const body = {
      'model': model,
      'prompt': prompt,
      'stream': false
    }

    console.log('Sending request to Ollama...');
    const response = await axios.post(url, body);

    const jsonString = response.data.response.match(/<PROJECT>(.*?)<\/PROJECT>/s)[1].trim();

    const jsonData = JSON.parse(jsonString);

    // Define the desktop directory path
    const desktopPath = 'C:\\Users\\yooo_\\Desktop';

    // Create the project directory
    fs.mkdirSync(desktopPath, { recursive: true });
    console.log(`Created directory: ${desktopPath}`);

    // Write each file to the corresponding path
    jsonData.files.forEach((file: { path: string; content: string }) => {
      const filePath = path.join(desktopPath, file.path);
      const dir = path.dirname(filePath);

      // Create the directory for the file if it doesn't exist
      fs.mkdirSync(dir, { recursive: true });

      // Write the file content
      fs.writeFileSync(filePath, file.content);
      console.log(`Created file: ${filePath}`);
    });

  } catch (error: unknown) {
    console.log('Error occurred:', error);
  }
}
