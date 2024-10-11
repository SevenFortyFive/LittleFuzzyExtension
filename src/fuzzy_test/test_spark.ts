import axios from 'axios';

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
        messages: [
            {
                role: 'user',
                content: 'who are you'
            }
        ],
        stream: true
    };
    try {
        const response = await axios.post(url, data, {
            headers,
            responseType: 'stream'
        });
        response.data.on('data', (chunk: Buffer) => {
            console.log(chunk.toString());
        });

        response.data.on('end', () => {
            console.log('stream out end');
        });
    } catch (error) {
        console.error('get stream error', error);
    }
}
