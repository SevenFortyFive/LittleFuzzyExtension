import axios from 'axios';
import { safeParseJsonResponse } from '../extension/utils';

export const APPID = '30cbe55b';
export const APIKey = 'd543fe19d02b6574e77f7af2f554ada5';
export const APISecret = 'N2U3NDU5OWVlNGE4ZWNiZjFhZjA5NTlh';
export const APIPassword = 'pOzlvybcujoykRmtklaB:KBfrEibirieBHhAVRuss';

const url = 'https://spark-api-open.xf-yun.com/v1/chat/completions';

interface Message {
    role: 'user' | 'system' | 'assistant';
    content: string;
}

interface SparkRequest {
    model: string;
    messages: Message[];
    stream?: boolean;
}

export async function streamFromSpark() {
    const headers = {
        'Authorization': `Bearer ${APIPassword}`,
        'Content-Type': 'application/json'
    };
    const data: SparkRequest = {
        model: 'general',
        messages:  [
          {
              'role': 'system',
              'content': '����Ϊ���벹ȫ���֣�����ҵĴ������룬ֻ���ز�ȫ��Ĵ��롣ȷ������������������ҷ��ϱ�̹淶��'
          },
          {
              'role': 'user',
              'content': '���'
          }
      ],
        stream: true
    };
    try {
        const response = await axios.post(url, data, {
            headers,
            responseType: 'stream'
        });

        let buffer = ''

        response.data.on('data', (chunk: Buffer) => {
            // console.log(chunk.toString());
            buffer += chunk
            let position
            while((position = buffer.indexOf('\n')) != -1){
                const line = buffer.substring(0, position)
                buffer = buffer.substring(position + 1)
              try{
                const json = safeParseJsonResponse(line)
                if(json && json.choices && json.choices.length > 0){
                  const choice = json.choices[0];
                  const delta = choice.delta;
                  if(delta && delta.content){
                    console.log(delta.content);
                  }
                }
              }catch (e){
                console.log('json parse error')
              }
            }
        });

        response.data.on('end', () => {
            console.log('stream out end');
        });
    } catch (error) {
        console.error('get stream error', error);
    }
}
