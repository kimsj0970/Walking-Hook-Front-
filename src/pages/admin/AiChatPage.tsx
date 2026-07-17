import { useState, useRef, useEffect } from 'react';
import { askAssistant } from '../../api/chatApi';
import styles from './AiChatPage.module.css';

interface Message {
  id: number;
  role: 'user' | 'ai';
  text: string;
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
  // 대화 식별자 — 첫 요청엔 없고, 서버가 발급한 값을 이후 요청에 재사용해 멀티턴 유지
  const conversationIdRef = useRef<string | undefined>(undefined);

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

    // 사용자 메시지 즉시 표시
    setMessages((prev) => [...prev, { id: ++idRef.current, role: 'user', text: q }]);

    try {
      const res = await askAssistant(q, conversationIdRef.current);
      conversationIdRef.current = res.conversationId;
      setMessages((prev) => [
        ...prev,
        { id: ++idRef.current, role: 'ai', text: res.answer },
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
        <p className={styles.pageSubtitle}>
          낚시 포인트·채비를 대화로 물어보세요. 포인트가 필요하면 AI가 되묻습니다.&nbsp;
          <span className={styles.keyHint}>Enter</span> 전송&nbsp;/&nbsp;
          <span className={styles.keyHint}>Shift+Enter</span> 줄바꿈
        </p>
      </div>

      <div className={styles.chatWrap}>
        <div className={styles.messageList}>
          {messages.length === 0 && !loading && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>낚시 관련 질문을 입력하세요</p>
              <p className={styles.emptyDesc}>
                "○○포인트 광어 채비 추천"처럼 물어보면
                <br />
                포인트를 확인해 현재 물때·기상에 맞는 채비를 안내합니다.
              </p>
            </div>
          )}

          {messages.map((msg) =>
            msg.role === 'user' ? (
              <div key={msg.id} className={styles.questionRow}>
                <div className={styles.questionBubble}>{msg.text}</div>
              </div>
            ) : (
              <div key={msg.id} className={styles.answerRow}>
                <div className={styles.answerAvatar}>AI</div>
                <div className={styles.answerContent}>
                  <div className={styles.answerBubble} style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </div>
                </div>
              </div>
            )
          )}

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

        {/* 입력 */}
        <div className={styles.inputWrap}>
          <div className={styles.inputBox}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_LEN))}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요..."
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
                {loading ? '분석 중...' : '전송'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
