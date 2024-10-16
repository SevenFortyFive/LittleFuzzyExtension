import axios from 'axios'
import fs from 'fs'
import path from 'path'

const model = 'llama3.1:8b'
const prompt = `Please generate a project based on the following description: "A basic web application with a login page and dashboard."+

Return the project structure in the following JSON format without any other words:
<PROJECT>
{
  "project_name": "Project Name",
  "description": "Brief description of the project",
  "files": [
    {
      "path": "src/index.html",
      "content": "HTML content for the main page with code"
    },
    {
      "path": "src/styles.css",
      "content": "CSS content for styling with code"
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

    console.log(response.data.response)
    const jsonString = response.data.response.match(/<PROJECT>(.*?)<\/PROJECT>/s)[1].trim();

    const jsonData = JSON.parse(jsonString);

    const desktopPath = 'C:\\Users\\yooo_\\Desktop';

    fs.mkdirSync(desktopPath, { recursive: true });
    console.log(`Created directory: ${desktopPath}`);

    jsonData.files.forEach((file: { path: string; content: string }) => {
      const filePath = path.join(desktopPath, file.path);
      const dir = path.dirname(filePath);

      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(filePath, file.content);
      console.log(`Created file: ${filePath}`);
    });

  } catch (error: unknown) {
    console.log('Error occurred:', error);
  }
}
