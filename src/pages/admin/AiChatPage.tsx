import { useState, useRef, useEffect } from 'react';
import { askAdmin, type ChatResponse } from '../../api/chatApi';
import styles from './AiChatPage.module.css';

interface Message {
  id: number;
  question: string;
  answer: string;
  usedChunks: number;
}

const MAX_LEN = 500;

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setError('');
    setLoading(true);
    textareaRef.current?.focus();

    try {
      const res: ChatResponse = await askAdmin(q);
      setMessages((prev) => [
        ...prev,
        { id: ++idRef.current, question: res.question, answer: res.answer, usedChunks: res.usedChunks },
      ]);
    } catch {
      setError('응답을 가져오지 못했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const remaining = MAX_LEN - input.length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>AI에게 질문</h1>
        <p className={styles.pageSubtitle}>RAG 기반 낚시 AI에게 자유롭게 질문하세요. Shift+Enter로 줄바꿈, Enter로 전송.</p>
      </div>

      <div className={styles.chatWrap}>
        {/* 대화 목록 */}
        <div className={styles.messageList}>
          {messages.length === 0 && !loading && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>AI에게 낚시 관련 질문을 해보세요</p>
              <p className={styles.emptyDesc}>어종, 낚시 포인트, 장비, 시즌 등 무엇이든 물어보세요.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={styles.messageGroup}>
              {/* 질문 버블 */}
              <div className={styles.questionRow}>
                <div className={styles.questionBubble}>{msg.question}</div>
              </div>

              {/* 답변 버블 */}
              <div className={styles.answerRow}>
                <div className={styles.answerAvatar}>AI</div>
                <div className={styles.answerContent}>
                  <div className={styles.answerBubble}>{msg.answer}</div>
                  <span className={styles.chunkBadge}>RAG 참조 청크 {msg.usedChunks}개</span>
                </div>
              </div>
            </div>
          ))}

          {/* 로딩 */}
          {loading && (
            <div className={styles.answerRow}>
              <div className={styles.answerAvatar}>AI</div>
              <div className={styles.answerContent}>
                <div className={`${styles.answerBubble} ${styles.answerBubbleLoading}`}>
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                </div>
              </div>
            </div>
          )}

          {error && <p className={styles.errorMsg}>{error}</p>}
          <div ref={bottomRef} />
        </div>

        {/* 입력 영역 */}
        <div className={styles.inputWrap}>
          <div className={styles.inputBox}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_LEN))}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요... (Enter 전송 / Shift+Enter 줄바꿈)"
              rows={3}
              disabled={loading}
            />
            <div className={styles.inputFooter}>
              <span className={`${styles.counter} ${remaining <= 50 ? styles.counterWarn : ''}`}>
                {remaining}자 남음
              </span>
              <button
                className={styles.sendBtn}
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
              >
                {loading ? '전송 중...' : '전송'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
