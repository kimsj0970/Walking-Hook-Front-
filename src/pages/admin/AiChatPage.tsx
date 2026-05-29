import { useState, useRef, useEffect } from 'react';
import { askAdmin, type ChatResponse, type SpeciesAnswer } from '../../api/chatApi';
import styles from './AiChatPage.module.css';

interface Message {
  id: number;
  question: string;
  answers: SpeciesAnswer[];
  rawAnswer: string;
  usedChunks: number;
}

const CATEGORIES: { key: keyof Omit<SpeciesAnswer, 'species'>; label: string; colorClass: string }[] = [
  { key: 'summary',         label: '요약',       colorClass: styles.catSummary    },
  { key: 'conditionReason', label: '조건 분석',   colorClass: styles.catCondition  },
  { key: 'pointReason',     label: '포인트 분석', colorClass: styles.catPoint      },
  { key: 'strategy',        label: '공략 전략',   colorClass: styles.catStrategy   },
  { key: 'tackle',          label: '채비 정보',   colorClass: styles.catTackle     },
  { key: 'caution',         label: '주의사항',    colorClass: styles.catCaution    },
];

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
        {
          id: ++idRef.current,
          question: res.question,
          answers: res.answers,
          rawAnswer: res.rawAnswer,
          usedChunks: res.usedChunks,
        },
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
          RAG 기반 낚시 AI에게 자유롭게 질문하세요.&nbsp;
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
                어종별 조황, 낚시 포인트 특성, 채비 추천, 시즌 정보 등
                <br />
                RAG 문서 기반으로 상세하게 답변합니다.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={styles.messageGroup}>
              {/* 질문 */}
              <div className={styles.questionRow}>
                <div className={styles.questionBubble}>{msg.question}</div>
              </div>

              {/* 답변 */}
              <div className={styles.answerRow}>
                <div className={styles.answerAvatar}>AI</div>
                <div className={styles.answerContent}>
                  {msg.answers.length > 0 ? (
                    <>
                      <div className={styles.speciesCards}>
                        {msg.answers.map((sp, i) => (
                          <SpeciesCard key={i} species={sp} />
                        ))}
                      </div>
                      <span className={styles.chunkBadge}>
                        RAG 참조 청크 {msg.usedChunks}개
                      </span>
                    </>
                  ) : (
                    <>
                      <div className={styles.answerBubble}>{msg.rawAnswer}</div>
                      <span className={styles.chunkBadge}>
                        RAG 참조 청크 {msg.usedChunks}개
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

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

function SpeciesCard({ species }: { species: SpeciesAnswer }) {
  return (
    <div className={styles.speciesCard}>
      <div className={styles.speciesHeader}>
        <span className={styles.speciesName}>{species.species}</span>
      </div>
      <div className={styles.categoryList}>
        {CATEGORIES.map(({ key, label, colorClass }) =>
          species[key] ? (
            <div key={key} className={`${styles.categoryItem} ${colorClass}`}>
              <span className={styles.categoryLabel}>{label}</span>
              <p className={styles.categoryText}>{species[key]}</p>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
