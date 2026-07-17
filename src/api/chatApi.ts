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

/** 대화형 어시스턴트(/admin/assistant/chat) 응답 */
export interface AssistantResponse {
  message: string;
  answer: string;
  /** 대화 식별자 — 다음 요청에 그대로 담아 보내면 직전 맥락이 이어진다 */
  conversationId: string;
}

/**
 * 툴콜 기반 멀티턴 어시스턴트에게 질문한다.
 * 첫 요청에는 conversationId를 생략하고, 응답으로 받은 값을 이후 요청에 전달한다.
 */
export async function askAssistant(
  message: string,
  conversationId?: string,
): Promise<AssistantResponse> {
  const { data } = await api.post('/admin/assistant/chat', {
    message,
    conversationId: conversationId ?? null,
  });
  return data.data as AssistantResponse;
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
