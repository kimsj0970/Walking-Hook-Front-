import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import {
  AlertIcon,
  BanIcon,
  CameraIcon,
  FishIcon,
  RulerIcon,
} from '../components/common/Icons';
import {
  analyzeFish,
  confirmFish,
  fetchFishIdExample,
  fetchFishIdQuota,
  fishIdErrorMessage,
  resizeImage,
  type FishIdQuota,
  type FishIdResponse,
  type FishIdVerdict,
} from '../api/fishIdApi';
import { getMyInfoApi, updateMeasureReferenceApi } from '../api/authApi';
import { fetchProvinces } from '../api/fishingPointApi';
import { uploadImage } from '../api/s3Api';
import { FISH_SPECIES_BY_GROUP, SPECIES_GROUP_LABELS } from '../api/fishSpecies';
import { useAuth } from '../context/AuthContext';
import styles from './FishIdPage.module.css';

/**
 * 사진 어종판별 — "이 물고기 가져가도 되나요?"
 *
 * 흐름 (v3 확정안)
 *   ① 한 뼘 등록  : 미등록자는 여기서 막힌다(필수). 등록해야 ②로 넘어간다.
 *   ② 사진 넣기   : 직접 업로드 또는 예시 사진. 하단에 촬영 가이드.
 *   ③ 결과        : "OO으로 추정" + 규제 판정 + (조건부) 크기 재보기
 *   ④ 조과글 쓰기 : 사진·어종·크기를 프리필해서 넘긴다.
 *
 * 사진은 판별 단계에서 서버에 저장되지 않는다. 조과글로 게시할 때 처음 S3에 올라간다.
 * 회원 전용 · 계정당 하루 3회(예시 테스트도 차감) · 관리자 무제한.
 */

type Step = 'hand' | 'upload' | 'result';

/**
 * 4탭 측정에서 찍는 점의 순서 안내.
 * 연체동물(살오징어)은 전장이 아니라 외투장이 기준이라 첫 두 점이 다르다 —
 * 다리를 포함해 재면 기준을 훌쩍 넘겨 잘못된 "가져가도 됩니다"가 나간다.
 */
function tapGuide(target: string): string[] {
  const body = target === 'MANTLE'
    ? ['몸통(외투) 끝을 눌러주세요', '눈 사이를 눌러주세요']
    : ['물고기 입 끝을 눌러주세요', '꼬리 끝을 눌러주세요'];
  return [...body, '뼘의 시작(엄지 끝)을 눌러주세요', '뼘의 끝(중지 끝)을 눌러주세요'];
}

const VERDICT_META: Record<
  string,
  { label: string; cls: 'ok' | 'warn' | 'bad'; icon: 'fish' | 'ruler' | 'ban' | 'alert' }
> = {
  OK: { label: '기준을 충족하는 것으로 보입니다', cls: 'ok', icon: 'fish' },
  NO_REGULATION: { label: '크기는 재지 않아도 됩니다', cls: 'ok', icon: 'fish' },
  BORDERLINE: { label: '경계선입니다 — 줄자로 확인하세요', cls: 'warn', icon: 'ruler' },
  MANUAL_CHECK: { label: '직접 확인이 필요합니다', cls: 'warn', icon: 'ruler' },
  RELEASE: { label: '방류 대상으로 보입니다', cls: 'bad', icon: 'ban' },
  CLOSED_SEASON: { label: '지금은 금어기입니다 — 방류하세요', cls: 'bad', icon: 'ban' },
};

const CONFIDENCE_KR: Record<string, string> = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };

interface TapPoint {
  x: number;
  y: number;
}

export default function FishIdPage() {
  const navigate = useNavigate();

  // ── 공통 상태 ──────────────────────────────────────────────
  const [step, setStep] = useState<Step>('upload');
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── ① 한 뼘 ────────────────────────────────────────────────
  // 체험판(비로그인): DemoRoute 가 통과시켰으면 여기 온 비로그인은 곧 체험판이다.
  // 한 뼘을 서버에 저장하지 않고 이 화면의 메모리에만 두었다가 판별 요청에 실어 보낸다.
  // 다음에 다시 오면 다시 입력한다 — 같은 폰을 여러 명이 써도 남의 손 크기가 남지 않는다.
  const { isLoggedIn } = useAuth();
  const demo = !isLoggedIn;
  const [handSpanMm, setHandSpanMm] = useState<number | null>(null);
  const [handInput, setHandInput] = useState('');

  // ── ② 사진 ─────────────────────────────────────────────────
  const [region, setRegion] = useState('');
  const [provinces, setProvinces] = useState<string[]>([]);
  const [quota, setQuota] = useState<FishIdQuota | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── ③ 결과 ─────────────────────────────────────────────────
  const [response, setResponse] = useState<FishIdResponse | null>(null);
  const [verdict, setVerdict] = useState<FishIdVerdict | null>(null);
  const [speciesCode, setSpeciesCode] = useState<string | null>(null);
  const [speciesName, setSpeciesName] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [measuredCm, setMeasuredCm] = useState<number | null>(null);

  // ── 크기 재보기 ────────────────────────────────────────────
  const [measureOpen, setMeasureOpen] = useState(false);
  const [measureTab, setMeasureTab] = useState<'manual' | 'tap'>('manual');
  const [manualCm, setManualCm] = useState('');
  const [manualWeight, setManualWeight] = useState('');
  const [measuredWeightG, setMeasuredWeightG] = useState<number | null>(null);
  const [taps, setTaps] = useState<TapPoint[]>([]);
  const photoRef = useRef<HTMLDivElement>(null);

  const [posting, setPosting] = useState(false);

  // AI가 어종을 잘못 짚었을 때 사용자가 직접 고르는 화면
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [corrected, setCorrected] = useState(false);

  // 마운트: 내 한 뼘 + 시·도 목록
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (demo) {
          const provs = await fetchProvinces().catch(() => []);
          if (!alive) return;
          setProvinces(provs.map((p) => p.displayName));
          setQuota(null);
          setStep('hand');
          return;
        }
        const [me, provs, q] = await Promise.all([
          getMyInfoApi(),
          fetchProvinces().catch(() => []),
          fetchFishIdQuota().catch(() => null),
        ]);
        if (!alive) return;
        setProvinces(provs.map((p) => p.displayName));
        setQuota(q);
        if (me.handSpanMm != null) {
          setHandSpanMm(me.handSpanMm);
          setStep('upload');
        } else {
          setStep('hand');
        }
      } catch {
        // 내 정보를 못 읽으면 기준자 유무를 알 수 없다. 통과시키지 말고 등록 화면에 세운다.
        if (alive) setStep('hand');
      } finally {
        if (alive) setBooting(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [demo]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handSpanCm = (handSpanMm ?? 0) / 10;

  // ── ① 한 뼘 등록 ───────────────────────────────────────────
  const saveHandSpan = async () => {
    const cm = Number(handInput);
    if (!Number.isFinite(cm) || cm < 10 || cm > 30) {
      setError('10 ~ 30cm 사이로 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const mm = Math.round(cm * 10);
      if (!demo) await updateMeasureReferenceApi(mm);
      setHandSpanMm(mm);
      setStep('upload');
    } catch (e: any) {
      setError(fishIdErrorMessage(e, '저장에 실패했어요.'));
    } finally {
      setLoading(false);
    }
  };

  // ── ② 판별 ─────────────────────────────────────────────────
  const applyResult = (result: FishIdResponse, url: string, source: Blob | null) => {
    setResponse(result);
    setVerdict(result.verdict);
    setSpeciesCode(result.candidates[0]?.code ?? null);
    setSpeciesName(result.candidates[0]?.nameKr ?? null);
    setConfirmed(false);
    setCorrected(false);
    setPickerOpen(false);
    setPickerQuery('');
    setMeasuredCm(null);
    setMeasuredWeightG(null);
    setManualCm('');
    setManualWeight('');
    setTaps([]);
    setMeasureOpen(false);
    setPreviewUrl(url);
    setBlob(source);
    setStep('result');
    void fetchFishIdQuota().then(setQuota).catch(() => {});
  };

  /**
   * 오류 한 곳 처리.
   *
   * 428(한 뼘 미등록)만 화면을 되돌리고, 나머지는 문구만 바꾼다. 문구는
   * fishIdErrorMessage 가 코드로 골라 주므로 **앱과 같은 문장이 나온다** —
   * 여기서 직접 문자열을 쓰면 양쪽이 조용히 어긋난다.
   */
  const handleApiError = (e: any, fallback: string) => {
    if (e?.response?.status === 428) {
      setStep('hand');
      setError('내 한 뼘을 먼저 등록해 주세요.');
      return;
    }
    setError(fishIdErrorMessage(e, fallback));
  };

  const runAnalyze = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        const resized = await resizeImage(file);
        const result = await analyzeFish(resized, region || undefined, handSpanMm ?? undefined);
        applyResult(result, URL.createObjectURL(resized), resized);
      } catch (e: any) {
        handleApiError(e, '분석에 실패했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    },
    // handSpanMm 을 빠뜨리면 이 콜백이 첫 렌더의 null 을 붙들고 있어(stale closure) 체험판이
    // 한 뼘 없이 요청을 보낸다 → 서버 'handSpanMm 없음'. 회원은 서버가 users 표에서 읽어 티가 안 났다.
    [region, handSpanMm],
  );

  const runExample = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { imageUrl, result } = await fetchFishIdExample();
      applyResult(result, imageUrl, null);
    } catch (e: any) {
      handleApiError(e, '예시를 불러오지 못했어요. 관리자 등록 전일 수 있어요.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBlob(null);
    setResponse(null);
    setVerdict(null);
    setSpeciesCode(null);
    setSpeciesName(null);
    setConfirmed(false);
    setCorrected(false);
    setPickerOpen(false);
    setPickerQuery('');
    setMeasuredCm(null);
    setMeasuredWeightG(null);
    setManualCm('');
    setManualWeight('');
    setTaps([]);
    setMeasureOpen(false);
    setError(null);
    setStep('upload');
  };

  // ── 혼동군 답 ──────────────────────────────────────────────
  const answer = async (code: string, name: string) => {
    if (!response) return;
    setLoading(true);
    setError(null);
    try {
      const v = await confirmFish({
        logId: response.logId,
        speciesCode: code,
        region: region || undefined,
        llmMinCm: response.size?.minCm,
        llmMaxCm: response.size?.maxCm,
        llmReliability: response.size?.reliability,
      });
      setVerdict(v);
      setSpeciesCode(code);
      setSpeciesName(name);
      setConfirmed(true);
    } catch (e: any) {
      setError(fishIdErrorMessage(e, '판정에 실패했어요.'));
    } finally {
      setLoading(false);
    }
  };

  // ── 크기 재판정 ────────────────────────────────────────────
  const submitMeasure = async (cm: number, source: 'MANUAL' | 'TAP_HAND') => {
    if (!response || !speciesCode) return;
    setLoading(true);
    setError(null);
    try {
      const v = await confirmFish({
        logId: response.logId,
        speciesCode,
        region: region || undefined,
        measuredMm: Math.round(cm * 10),
        measureSource: source,
        llmMinCm: response.size?.minCm,
        llmMaxCm: response.size?.maxCm,
        llmReliability: response.size?.reliability,
      });
      setVerdict(v);
      setMeasuredCm(Number(cm.toFixed(1)));
      setMeasuredWeightG(null);
      setMeasureOpen(false);
    } catch (e: any) {
      setError(fishIdErrorMessage(e, '판정에 실패했어요.'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * 사용자가 어종을 직접 고쳐잡는다.
   *
   * <p>AI가 틀렸을 때 빠져나갈 길이 없으면 사용자는 "다른 사진으로"를 누를 수밖에 없고,
   * 그러면 하루 3회를 또 깎으면서 같은 오답을 받는다. 사람이 아는 답을 바로 넣게 한다.
   * 고친 기록은 서버에 남아 어떤 종이 자주 틀리는지 보는 근거가 된다.
   */
  const pickSpecies = async (code: string, name: string) => {
    if (!response) return;
    setLoading(true);
    setError(null);
    try {
      const v = await confirmFish({
        logId: response.logId,
        speciesCode: code,
        region: region || undefined,
        measuredMm: measuredCm != null ? Math.round(measuredCm * 10) : undefined,
        measureSource: measuredCm != null ? 'MANUAL' : undefined,
        measuredWeightG: measuredWeightG ?? undefined,
        userCorrected: true,
      });
      setVerdict(v);
      setSpeciesCode(code);
      setSpeciesName(name);
      setConfirmed(true);
      setCorrected(true);
      setPickerOpen(false);
      setPickerQuery('');
    } catch (e: any) {
      handleApiError(e, '판정에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  /** 무게 기준 종(대문어) — 저울 값으로 재판정 */
  const submitWeight = async (grams: number) => {
    if (!response || !speciesCode) return;
    setLoading(true);
    setError(null);
    try {
      const v = await confirmFish({
        logId: response.logId,
        speciesCode,
        region: region || undefined,
        measuredWeightG: Math.round(grams),
      });
      setVerdict(v);
      setMeasuredWeightG(Math.round(grams));
      setMeasuredCm(null);
      setMeasureOpen(false);
    } catch (e: any) {
      handleApiError(e, '판정에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  const tapCm = useMemo(() => {
    if (taps.length < 4) return null;
    const d = (a: TapPoint, b: TapPoint) => Math.hypot(a.x - b.x, a.y - b.y);
    const fishPx = d(taps[0], taps[1]);
    const handPx = d(taps[2], taps[3]);
    if (handPx < 8) return null;
    return (fishPx / handPx) * handSpanCm;
  }, [taps, handSpanCm]);

  /** 탭 모드 진입 — 눌러야 할 대상(사진)이 화면에 보이게 올려준다. */
  const startTapMode = () => {
    setMeasureTab('tap');
    setTaps([]);
    setTimeout(() => photoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  };

  const onPhotoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!measureOpen || measureTab !== 'tap' || taps.length >= 4) return;
    const rect = photoRef.current!.getBoundingClientRect();
    setTaps((prev) => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  // ── ④ 조과글 쓰기 ──────────────────────────────────────────
  const goWriteCatchPost = async () => {
    setPosting(true);
    setError(null);
    try {
      let photoUrls: string[] = [];
      if (blob) {
        const file = new File([blob], `fish-${Date.now()}.jpg`, { type: 'image/jpeg' });
        photoUrls = [await uploadImage(file, 'CATCH_POST')];
      }
      navigate('/catch-posts', {
        state: {
          openWrite: true,
          prefill: {
            species: speciesName ? [speciesName] : [],
            fishSizeCm: measuredCm != null ? String(measuredCm) : '',
            photoUrls,
            aiAssisted: true,
          },
        },
      });
    } catch (e: any) {
      setError(fishIdErrorMessage(e, '사진 업로드에 실패했어요.'));
    } finally {
      setPosting(false);
    }
  };

  // 무엇을 재야 하는지는 서버가 규제에서 정해 내려준다.
  // 금어기·규제 없음이면 NONE 이라 측정 UI 자체가 뜨지 않는다.
  const target = verdict?.measureTarget ?? 'NONE';
  const canMeasure = !!verdict && target !== 'NONE';
  const isWeight = target === 'WEIGHT';
  const canTap = !!verdict?.measureTappable;

  const top = response?.candidates[0];
  const meta = verdict ? VERDICT_META[verdict.result] : null;

  if (booting) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <div className={styles.booting}>불러오는 중…</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        {/* ─────────── ① 한 뼘 등록 ─────────── */}
        {step === 'hand' && (
          <section className={styles.card}>
            <span className={styles.badge}>1단계</span>
            <h1 className={styles.title}>{demo ? '먼저 내 한 뼘을 알려주세요' : '먼저 내 한 뼘을 등록해주세요'}</h1>
            <p className={styles.sub}>
              사진 속 물고기 크기를 재는 <b>유일한 기준자</b>입니다. 기준자가 없으면 크기를 잘못 재고,
              그 오차가 금지체장 판정으로 그대로 넘어가기 때문에 등록 전에는 판별을 시작할 수 없어요.
              {demo
                ? ' 체험판에서는 저장하지 않아요 — 다음에 오시면 다시 입력합니다.'
                : ' 한 번만 등록하면 다음부터는 바로 판별로 넘어갑니다.'}
            </p>
            <img className={styles.guideImg} src="/images/guide/hand_span_guide.png" alt="한 뼘 재는 법" />
            <p className={styles.note}>
              엄지 끝부터 검지 또는 중지 끝까지의 직선 거리입니다. 사진 찍을 때도 같은 손가락을
              펴주세요.
            </p>
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="예: 19"
                value={handInput}
                onChange={(e) => setHandInput(e.target.value)}
              />
              <span className={styles.unit}>cm</span>
            </div>
            <p className={styles.helper}>보통 어른은 15 ~ 23cm 사이입니다.</p>
            <button className={styles.primaryBtn} onClick={saveHandSpan} disabled={loading}>
              {demo ? '판별 시작하기' : '등록하고 판별 시작하기'}
            </button>
            <p className={styles.helper}>
              {demo ? '가입하면 한 번만 등록하고 계속 쓸 수 있어요.' : '마이페이지에서 언제든 다시 고칠 수 있어요.'}
            </p>
          </section>
        )}

        {/* ─────────── ② 사진 넣기 ─────────── */}
        {step === 'upload' && (
          <>
            <h1 className={styles.title}>이 물고기, 가져가도 되나요?</h1>
            <p className={styles.sub}>
              사진 한 장으로 어종을 판별하고 금어기·금지체장을 바로 확인합니다.
            </p>

            {provinces.length > 0 && (
              <div className={styles.regionRow}>
                <label className={styles.regionLabel}>낚시한 지역</label>
                <select
                  className={styles.select}
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="">전국 기준</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.guideBox}>
              <div className={styles.guideTitle}>
                <RulerIcon size={16} /> 먼저 — 이렇게 찍으면 잘 맞아요
              </div>
              <img className={styles.guideImg} src="/images/guide/fish_measure_guide.png" alt="촬영 가이드" />
              <p className={styles.note}>
                물고기 옆면 전체가 보이게, 펼친 손을 물고기 옆에 나란히 두고 위에서 찍어주세요.
              </p>
            </div>
            <div
              className={styles.drop}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) void runAnalyze(f);
              }}
            >
              <span className={styles.dropIcon}>
                <CameraIcon size={30} strokeWidth={1.7} />
              </span>
              <strong>물고기 사진 올리기</strong>
              <span className={styles.dropHint}>눌러서 촬영하거나 앨범에서 고르세요</span>
              {/* capture="environment" 를 달면 안 된다 — 휴대폰이 곧장 카메라를 열어버려서
                  이미 찍어둔 사진을 앨범에서 고를 방법이 사라진다. 빼두면 휴대폰은
                  카메라·앨범·파일을 모두 띄우고, 데스크톱은 지금처럼 파일 선택창이 뜬다. */}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void runAnalyze(f);
                }}
              />
            </div>

            <button className={styles.exampleBtn} onClick={runExample} disabled={loading}>
              <img src="/images/fish-id/example.jpg" alt="" className={styles.exampleThumb} />
              <span>
                <strong>예시 사진으로 테스트해보기</strong>
                <em>사진이 없어도 흐름을 볼 수 있어요</em>
              </span>
            </button>

            <p className={styles.quota}>
              {quota && !quota.unlimited ? (
                <>
                  오늘 <b className={quota.remaining === 0 ? styles.quotaOut : styles.quotaLeft}>
                    {quota.remaining}회
                  </b>{' '}
                  남았어요 (하루 {quota.limit}회 · 예시 테스트 포함).
                </>
              ) : quota?.unlimited ? (
                <>관리자 계정이라 횟수 제한 없이 쓸 수 있어요.</>
              ) : (
                <>하루 3회까지 이용할 수 있어요 (예시 테스트 포함).</>
              )}{' '}
              올린 사진은 판별이 끝나면 서버에 남지 않습니다.
            </p>

          </>
        )}

        {/* ─────────── ③ 결과 ─────────── */}
        {step === 'result' && response && (
          <>
            <button className={styles.back} onClick={reset}>
              ‹ 다른 사진으로 분석하기
            </button>

            {previewUrl && (
              <div
                ref={photoRef}
                className={`${styles.photo} ${measureOpen && measureTab === 'tap' ? styles.photoTapping : ''}`}
                onClick={onPhotoTap}
              >
                <img src={previewUrl} alt="판별한 사진" />
                {measureOpen && measureTab === 'tap' && (
                  <div className={styles.tapBanner}>
                    {taps.length < 4
                      ? `${taps.length + 1}/4 · ${tapGuide(target)[taps.length]}`
                      : `4/4 · 다 찍었어요 — 아래에서 확인하세요`}
                  </div>
                )}
                {measureOpen &&
                  measureTab === 'tap' &&
                  taps.map((p, i) => (
                    <span
                      key={i}
                      className={`${styles.tapDot} ${i >= 2 ? styles.tapDotHand : ''}`}
                      style={{ left: p.x, top: p.y }}
                    >
                      {i + 1}
                    </span>
                  ))}
              </div>
            )}

            {/* 여러 마리 중 한 마리를 골라 답한 경우 등, 결과 위에 한 줄로 알린다.
                NOT_FISH 는 아래 카드가 같은 문구를 이미 보여주므로 중복을 피한다. */}
            {response.notice && response.status !== 'NOT_FISH' && (
              <p className={styles.noticeBar}>{response.notice}</p>
            )}

            {response.status === 'NOT_FISH' && (
              <section className={`${styles.card} ${styles.cardMuted}`}>
                <div className={styles.notFishHead}>
                  <AlertIcon size={22} /> 분석하지 못했어요
                </div>
                <p className={styles.note}>
                  {response.notice ??
                    '물고기가 가려졌거나 너무 작게 나온 것 같아요. 한 마리가 화면을 크게 채우도록, 옆면이 보이게 다시 찍어주세요.'}
                </p>
              </section>
            )}

            {response.status === 'UNIDENTIFIED' && (
              <section className={`${styles.card} ${styles.cardMuted}`}>
                <div className={styles.notFishHead}>
                  <AlertIcon size={22} /> 어종을 확신하기 어려워요
                </div>
                {response.candidates.length > 0 && (
                  <p className={styles.note}>
                    후보: {response.candidates.map((c) => c.nameKr).join(' · ')} — 헷갈리는 어종
                    비교 화면에서 직접 확인해보세요.
                  </p>
                )}
              </section>
            )}

            {(response.status === 'OK' || response.status === 'NEED_CONFIRM') && top && (
              <section className={styles.card}>
                <div className={styles.speciesRow}>
                  <h2 className={styles.speciesName}>
                    {speciesName ?? top.nameKr}
                    <span className={styles.assume}>{confirmed ? '' : '(으)로 추정'}</span>
                  </h2>
                  <span className={styles.conf}>
                    {corrected ? '직접 고름' : confirmed ? '확인됨' : `확신 ${CONFIDENCE_KR[top.confidence] ?? top.confidence}`}
                  </span>
                </div>
                {top.features.length > 0 && (
                  <p className={styles.note}>관찰된 특징 · {top.features.join(' · ')}</p>
                )}
                <button className={styles.notThisBtn} onClick={() => setPickerOpen((v) => !v)}>
                  이 어종이 아닌가요? 직접 고르기
                </button>

                {pickerOpen && (
                  <div className={styles.picker}>
                    <input
                      className={styles.pickerSearch}
                      type="search"
                      autoFocus
                      placeholder="어종 이름으로 찾기"
                      value={pickerQuery}
                      onChange={(e) => setPickerQuery(e.target.value)}
                    />
                    <div className={styles.pickerList}>
                      {FISH_SPECIES_BY_GROUP.map(([group, items]) => {
                        const shown = items.filter(([, label]) => label.includes(pickerQuery.trim()));
                        if (shown.length === 0) return null;
                        return (
                          <div key={group} className={styles.pickerGroup}>
                            <div className={styles.pickerGroupTitle}>{SPECIES_GROUP_LABELS[group]}</div>
                            <div className={styles.pickerChips}>
                              {shown.map(([code, label]) => (
                                <button
                                  key={code}
                                  className={`${styles.pickerChip} ${code === speciesCode ? styles.pickerChipOn : ''}`}
                                  disabled={loading}
                                  onClick={() => pickSpecies(code, label)}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {measuredWeightG != null ? (
                  <p className={styles.sizeLine}>
                    <RulerIcon size={15} /> 잰 무게 {measuredWeightG}g
                  </p>
                ) : measuredCm != null ? (
                  <p className={styles.sizeLine}>
                    <RulerIcon size={15} /> 잰 {verdict?.measureLabel || '크기'} 약 {measuredCm}cm
                  </p>
                ) : (
                  response.size?.minCm != null &&
                  response.size?.maxCm != null && (
                    <p className={styles.sizeLine}>
                      <RulerIcon size={15} /> 사진 추정 {response.size.minCm}~{response.size.maxCm}cm
                      <em>(참고용)</em>
                    </p>
                  )
                )}
              </section>
            )}

            {/* 혼동군 질문 */}
            {response.status === 'NEED_CONFIRM' && !confirmed && response.question && (
              <section className={`${styles.card} ${styles.question}`}>
                <strong className={styles.qText}>{response.question.text}</strong>
                <div className={styles.qBtns}>
                  <button disabled={loading} onClick={() => answer(response.question!.yesCode, response.question!.yesNameKr)}>
                    네 · {response.question.yesNameKr}
                  </button>
                  <button disabled={loading} onClick={() => answer(response.question!.noCode, response.question!.noNameKr)}>
                    아니요 · {response.question.noNameKr}
                  </button>
                </div>
              </section>
            )}

            {/* 판정 */}
            {verdict && meta && (
              <section className={`${styles.verdict} ${styles[meta.cls]}`}>
                <div className={styles.verdictHead}>
                  <span className={styles.verdictIcon}>
                    {meta.icon === 'ban' ? <BanIcon size={22} /> : meta.icon === 'ruler' ? <RulerIcon size={22} /> : <FishIcon size={22} />}
                  </span>
                  {meta.label}
                </div>
                {verdict.limitText && <p>{verdict.limitText}</p>}
                {verdict.closedSeasonText && <p>{verdict.closedSeasonText}</p>}
                {verdict.caution && <p className={styles.caution}>{verdict.caution}</p>}
                <p className={styles.basis}>
                  {verdict.legalBasis} · 기준일 {verdict.effectiveDate}
                  {verdict.regionUsed ? ` · ${verdict.regionUsed} 기준` : ' · 전국 기준'} — 판별은
                  참고용입니다. 최종 확인은 직접 해주세요.
                </p>
              </section>
            )}

            {/* 크기 재보기 */}
            {canMeasure && !measureOpen && (
              <button
                className={styles.secondaryBtn}
                onClick={() => {
                  setMeasureOpen(true);
                  if (canTap) startTapMode();
                  else setMeasureTab('manual');
                }}
              >
                <RulerIcon size={17} />
                {isWeight ? ' 무게 입력하고 다시 판정' : ` ${verdict?.measureLabel ?? '크기'} 재보기`}
              </button>
            )}

            {measureOpen && (
              <section className={styles.card}>
                {isWeight ? (
                  /* 대문어 — 사진으로는 무게를 알 수 없다. 저울 값만 받는다. */
                  <>
                    <p className={styles.tapGuide}>
                      <b>저울로 잰 무게</b>를 입력해주세요. {verdict?.measureGuide}
                    </p>
                    <div className={styles.inputRow}>
                      <input
                        className={styles.input}
                        type="number"
                        inputMode="numeric"
                        step="10"
                        placeholder="예: 850"
                        value={manualWeight}
                        onChange={(e) => setManualWeight(e.target.value)}
                      />
                      <span className={styles.unit}>g</span>
                    </div>
                    <button
                      className={styles.primaryBtn}
                      disabled={loading || !manualWeight}
                      onClick={() => submitWeight(Number(manualWeight))}
                    >
                      이 무게로 다시 판정
                    </button>
                  </>
                ) : (
                  <>
                    {/* 사진에서 짚기 어려운 부위(항문장·체반폭)는 직접 입력만 받는다 */}
                    {canTap && (
                      <div className={styles.tabs}>
                        <button
                          className={measureTab === 'manual' ? styles.tabOn : styles.tab}
                          onClick={() => setMeasureTab('manual')}
                        >
                          줄자로 잰 값 입력
                        </button>
                        <button
                          className={measureTab === 'tap' ? styles.tabOn : styles.tab}
                          onClick={startTapMode}
                        >
                          사진에서 재기
                        </button>
                      </div>
                    )}

                    {measureTab === 'manual' || !canTap ? (
                      <>
                        <div className={styles.inputRow}>
                          <input
                            className={styles.input}
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            placeholder="예: 31.5"
                            value={manualCm}
                            onChange={(e) => setManualCm(e.target.value)}
                          />
                          <span className={styles.unit}>cm</span>
                        </div>
                        <p className={styles.helper}>
                          {verdict?.measureLabel} 기준 — {verdict?.measureGuide}
                        </p>
                        <button
                          className={styles.primaryBtn}
                          disabled={loading || !manualCm}
                          onClick={() => submitMeasure(Number(manualCm), 'MANUAL')}
                        >
                          이 크기로 다시 판정
                        </button>
                      </>
                    ) : (
                      <>
                        <p className={styles.helper}>
                          {verdict?.measureLabel} 기준 — {verdict?.measureGuide}
                        </p>
                        <p className={styles.tapGuide}>
                          {taps.length < 4 ? (
                            <>
                              <b>{taps.length + 1}/4</b> {tapGuide(target)[taps.length]}
                              <br />
                              <em className={styles.tapHint}>위 사진에서 해당 지점을 눌러주세요</em>
                            </>
                          ) : (
                            <>
                              계산된 {verdict?.measureLabel} <b>약 {tapCm ? tapCm.toFixed(1) : '—'}cm</b>
                              {` (내 뼘 ${handSpanCm}cm 기준)`}
                            </>
                          )}
                        </p>
                        <div className={styles.tapActions}>
                          <button
                            className={styles.textBtn}
                            disabled={taps.length === 0}
                            onClick={() => setTaps([])}
                          >
                            다시 찍기
                          </button>
                          <button
                            className={styles.primaryBtn}
                            disabled={loading || taps.length < 4 || !tapCm}
                            onClick={() => submitMeasure(tapCm!, 'TAP_HAND')}
                          >
                            이 크기로 다시 판정
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
                <button className={styles.textBtn} onClick={() => setMeasureOpen(false)}>
                  닫기
                </button>
              </section>
            )}

            {/* 다음 행동 */}
            <div className={styles.actions}>
              {(response.status === 'OK' || response.status === 'NEED_CONFIRM') && (
                <button className={styles.primaryBtn} onClick={goWriteCatchPost} disabled={posting}>
                  {posting ? '사진 올리는 중…' : '이 물고기로 조과글 쓰기'}
                </button>
              )}
              <button className={styles.secondaryBtn} onClick={reset}>
                다른 사진으로 분석하기
              </button>
            </div>
          </>
        )}

        {loading && (
          <div className={styles.overlay} role="status" aria-live="polite">
            <div className={styles.overlayBox}>
              <div className={styles.spinner} />
              <strong>사진을 분석하고 있어요</strong>
              <span>어종을 찾고 금어기·금지체장을 확인하는 중입니다. 5~10초 걸려요.</span>
            </div>
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}
      </main>
    </div>
  );
}
