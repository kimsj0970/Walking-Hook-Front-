import api from './authApi';

export interface SpeciesAnswer {
  species: string;
  summary: string;
  conditionReason: string;
  pointReason: string;
  strategy: string;
  tackle: string;
  caution: string;
}

export interface ChatResponse {
  question: string;
  answers: SpeciesAnswer[];
  rawAnswer: string;
  usedChunks: number;
}

export async function askAdmin(question: string): Promise<ChatResponse> {
  const { data } = await api.post('/admin/chat', { question });
  const raw = data.data as { question: string; answer: string; usedChunks: number };

  let answers: SpeciesAnswer[] = [];
  try {
    const parsed: unknown = JSON.parse(raw.answer);
    if (Array.isArray(parsed)) {
      answers = parsed as SpeciesAnswer[];
    }
  } catch {
    // AI가 JSON 형식이 아닌 텍스트를 반환한 경우 rawAnswer로 폴백
  }

  return {
    question: raw.question,
    answers,
    rawAnswer: raw.answer,
    usedChunks: raw.usedChunks,
  };
}
