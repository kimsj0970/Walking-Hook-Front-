import { useEffect, useState } from 'react';
import styles from './LoginModal.module.css';

const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY as string;
const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI as string;

function buildKakaoLoginUrl(): string {
  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_provider', 'kakao');
  return (
    `https://kauth.kakao.com/oauth/authorize` +
    `?client_id=${KAKAO_REST_API_KEY}` +
    `&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}` +
    `&response_type=code` +
    `&state=${state}`
  );
}

// ── 약관 전문 내용 ────────────────────────────────────────────────────────────

const TERMS_CONTENT = {
  terms: `제1조 (목적)
이 약관은 Walking Hook(이하 "서비스")의 이용 조건 및 절차, 이용자와 회사의 권리·의무 및 책임사항을 규정합니다.

제2조 (이용자 자격)
만 14세 이상인 자로서 이 약관에 동의한 자는 서비스를 이용할 수 있습니다.

제3조 (금지 행위)
이용자는 다음 행위를 하여서는 안 됩니다.
• 타인의 정보를 도용하거나 허위 정보를 등록하는 행위
• 서비스의 정상적인 운영을 방해하는 행위
• 다른 이용자에게 피해를 주는 행위

제4조 (서비스 이용 해지)
이용자는 언제든지 회원 탈퇴를 신청할 수 있으며, 탈퇴 즉시 개인정보는 삭제됩니다.`,

  privacy: `수집하는 개인정보 항목
• 필수: 이메일 주소, 닉네임, 소셜계정 고유 ID(카카오/네이버/구글)
• 선택: 프로필 사진

수집 및 이용 목적
• 회원 식별 및 서비스 제공
• 불법·부정 이용 방지
• 고객 문의 응대

보유 및 이용 기간
• 회원 탈퇴 시까지 보유 후 즉시 파기
• 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관
  (예: 전자상거래법에 따른 계약·청약철회 기록 5년)

개인정보 제3자 제공
서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.`,

  location: `제1조 (목적)
이 약관은 Walking Hook이 제공하는 위치기반서비스의 이용 조건 및 절차를 규정합니다.

제2조 (위치정보 수집)
• 수집 항목: 기기의 GPS 위치정보(위도·경도)
• 수집 시점: 지도 페이지 접근 시, 이용자가 명시적으로 허용한 경우에 한함

제3조 (위치정보 이용)
• 주변 낚시 포인트 지도 표시 및 거리 안내
• 위치정보는 서비스 이용 중에만 사용되며, 별도로 서버에 저장하지 않습니다.

제4조 (위치정보 수집 거부)
이용자는 기기 설정에서 위치 권한을 거부할 수 있으며, 이 경우 위치 기반 기능 이용이 제한될 수 있습니다.`,

  marketing: `마케팅 정보 수신 동의 (선택)

수신 내용
• 신규 낚시 포인트 등록 알림
• 시즌별 조황 정보 및 이벤트 안내
• 서비스 업데이트 소식

수신 채널
• 앱 내 푸시 알림, 이메일

동의 철회
마이페이지 > 알림 설정에서 언제든지 수신 거부할 수 있습니다.`,
};

// ── 타입 ──────────────────────────────────────────────────────────────────────

type Step = 'providers' | 'consent';
type Provider = 'kakao';

interface ConsentState {
  terms: boolean;
  privacy: boolean;
  location: boolean;
  marketing: boolean;
}

const ALL_REQUIRED: (keyof ConsentState)[] = ['terms', 'privacy', 'location'];

const CONSENT_ITEMS: {
  key: keyof ConsentState;
  required: boolean;
  label: string;
  content: string;
}[] = [
  { key: 'terms', required: true, label: '이용약관 동의', content: TERMS_CONTENT.terms },
  { key: 'privacy', required: true, label: '개인정보 수집·이용 동의', content: TERMS_CONTENT.privacy },
  { key: 'location', required: true, label: '위치기반서비스 이용약관 동의', content: TERMS_CONTENT.location },
  { key: 'marketing', required: false, label: '마케팅 수신 동의', content: TERMS_CONTENT.marketing },
];

const DEFAULT_CONSENT: ConsentState = {
  terms: false,
  privacy: false,
  location: false,
  marketing: false,
};

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>('providers');
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT);
  const [expanded, setExpanded] = useState<keyof ConsentState | null>(null);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      setStep('providers');
      setPendingProvider(null);
      setConsent(DEFAULT_CONSENT);
      setExpanded(null);
    }
  }, [open]);

  // ESC 키
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (step === 'consent') setStep('providers');
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, step, onClose]);

  // 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  // ── 제공자 선택 시 약관 동의 화면으로
  const handleProviderClick = (provider: Provider, e: React.MouseEvent) => {
    e.preventDefault();
    setPendingProvider(provider);
    setStep('consent');
  };

  // ── 전체 동의
  const allChecked = Object.values(consent).every(Boolean);
  const handleAgreeAll = () => {
    const next = !allChecked;
    setConsent({ terms: next, privacy: next, location: next, marketing: next });
  };

  // ── 개별 항목 토글
  const toggle = (key: keyof ConsentState) => {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── 필수 항목 모두 동의 여부
  const canProceed = ALL_REQUIRED.every((k) => consent[k]);

  // ── 동의 후 OAuth 진행
  const handleProceed = () => {
    if (!canProceed || !pendingProvider) return;
    if (pendingProvider === 'kakao') {
      window.location.href = buildKakaoLoginUrl();
    }
  };

  // ── 전문보기 토글
  const toggleExpanded = (key: keyof ConsentState, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => (prev === key ? null : key));
  };

  return (
    <div className={styles.overlay} onClick={step === 'consent' ? undefined : onClose}>
      <div
        className={`${styles.modal} ${step === 'consent' ? styles.modalConsent : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── STEP 1: 소셜 로그인 선택 ───────────────────────────────── */}
        {step === 'providers' && (
          <>
            <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">✕</button>

            <div className={styles.header}>
              <span className={styles.headerIcon}>🎣</span>
              <h2 className={styles.title}>Walking Hook 로그인</h2>
              <p className={styles.subtitle}>소셜 계정으로 간편하게 시작하세요</p>
            </div>

            <div className={styles.providers}>
              <a
                href="#"
                onClick={(e) => handleProviderClick('kakao', e)}
                className={`${styles.providerBtn} ${styles.kakao}`}
              >
                <svg className={styles.providerIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.48 3 2 6.69 2 11.25c0 2.91 1.82 5.47 4.58 6.96l-.93 3.46c-.08.3.26.54.52.36l4.18-2.76c.52.07 1.06.1 1.65.1 5.52 0 10-3.69 10-8.25S17.52 3 12 3z"/>
                </svg>
                <span>카카오로 시작하기</span>
              </a>

              <button className={`${styles.providerBtn} ${styles.naver} ${styles.disabled}`} disabled>
                <svg className={styles.providerIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
                </svg>
                <span>네이버로 시작하기</span>
                <span className={styles.badge}>준비 중</span>
              </button>

              <button className={`${styles.providerBtn} ${styles.google} ${styles.disabled}`} disabled>
                <svg className={styles.providerIcon} viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Google로 시작하기</span>
                <span className={styles.badge}>준비 중</span>
              </button>
            </div>

            <p className={styles.terms}>
              로그인 시 서비스 약관에 동의하는 화면이 표시됩니다.
            </p>
          </>
        )}

        {/* ── STEP 2: 약관 동의 ───────────────────────────────────────── */}
        {step === 'consent' && (
          <>
            <div className={styles.consentHeader}>
              <button
                className={styles.backBtn}
                onClick={() => setStep('providers')}
                aria-label="뒤로"
              >
                ← 뒤로
              </button>
              <h2 className={styles.consentTitle}>서비스 이용 동의</h2>
              <p className={styles.consentSubtitle}>
                Walking Hook을 이용하려면 아래 약관에 동의해 주세요.
              </p>
            </div>

            {/* 전체 동의 */}
            <label className={styles.agreeAllRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={allChecked}
                onChange={handleAgreeAll}
              />
              <span className={styles.agreeAllLabel}>전체 동의</span>
              <span className={styles.agreeAllSub}>선택 항목 포함</span>
            </label>

            <div className={styles.divider} />

            {/* 개별 항목 */}
            <div className={styles.consentList}>
              {CONSENT_ITEMS.map(({ key, required, label, content }) => (
                <div key={key} className={styles.consentItem}>
                  <div className={styles.consentRow}>
                    <label className={styles.consentLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={consent[key]}
                        onChange={() => toggle(key)}
                      />
                      <span className={`${styles.requiredBadge} ${required ? styles.required : styles.optional}`}>
                        {required ? '필수' : '선택'}
                      </span>
                      <span className={styles.consentLabelText}>{label}</span>
                    </label>
                    <button
                      className={styles.viewBtn}
                      onClick={(e) => toggleExpanded(key, e)}
                    >
                      {expanded === key ? '닫기 ▲' : '전문보기 ▼'}
                    </button>
                  </div>
                  {expanded === key && (
                    <div className={styles.consentContent}>
                      <pre className={styles.consentText}>{content}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 진행 버튼 */}
            <button
              className={`${styles.proceedBtn} ${canProceed ? '' : styles.proceedDisabled}`}
              onClick={handleProceed}
              disabled={!canProceed}
            >
              {pendingProvider === 'kakao' && '동의하고 카카오로 시작하기'}
            </button>

            {!canProceed && (
              <p className={styles.proceedHint}>필수 항목에 모두 동의해야 진행할 수 있습니다.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
