import type { ReactNode } from 'react';
import {
  BanIcon, BookIcon, CameraIcon, CctvIcon, ChevronRightIcon, FishIcon, HookIcon,
  PinIcon, RulerIcon, WaveIcon,
} from '../common/Icons';
import styles from './DemoSection.module.css';

/**
 * 웹 체험판(비로그인) 섹션 — 홈에서 기존 "사진으로 어종 판별" 카드와 바로가기 자리를 대신한다.
 *
 * 로그인 사용자에게는 이 컴포넌트가 아예 그려지지 않는다. 버튼이 누르는 함수는 전부 부모(HomePage)가
 * 이미 갖고 있던 것이라, 여기엔 화면만 있고 로직이 없다. 체험판이 끝나면 이 폴더와 HomePage 의
 * 분기 한 줄만 지우면 원래 홈이다.
 *
 * 점선 테두리와 "체험판" 배지는 이 블록이 임시라는 신호 — 정식 카드(흰 배경·실선)와 구분한다.
 */
interface Props {
  onAnalysis: () => void;
  onFishId: () => void;
  onMigratoryMap: () => void;
  onAllPointsMap: () => void;
  onCctv: () => void;
  onFishingZones: () => void;
  onRegulations: () => void;
  onTackle: () => void;
  onGuide: () => void;
  /** 이번 달 금어기 어종 수 — 금어기 타일의 빨간 배지. 0 이면 안 그린다. */
  closedThisMonthCount: number;
}

export default function DemoSection(p: Props) {
  return (
    <section className={styles.box} aria-label="체험판">
      <div className={styles.head}>
        <span className={styles.badge}>체험판</span>
        <h2 className={styles.title}>로그인 없이 바로 써보기</h2>
      </div>

      <div className={styles.cards}>
        <BigCard
          icon={<WaveIcon size={24} />}
          title="AI 조황 분석 체험"
          desc="지도에서 포인트를 골라 오늘 조황을 확인"
          action="바로 보기"
          onClick={p.onAnalysis}
        />
        <BigCard
          icon={<CameraIcon size={24} />}
          title="사진 어종 판별 체험"
          desc="사진 한 장으로 어종과 가져가도 되는지 확인"
          action="바로 체험하기"
          onClick={p.onFishId}
        />
      </div>

      {/* 바로가기 — 기존 홈과 같은 순서. 아이콘·라벨도 같다. */}
      <div className={styles.quickBox}>
        <div className={styles.quickTitle}>바로가기</div>
        <div className={styles.quick}>
          <Quick icon={<FishIcon size={20} />} label="어종 현황" onClick={p.onMigratoryMap} />
          <Quick icon={<PinIcon size={20} />} label={<>모든 낚시 포인트<br />&amp; 유튜버 포인트</>} onClick={p.onAllPointsMap} />
          <Quick icon={<CctvIcon size={20} />} label="CCTV" onClick={p.onCctv} />
          <Quick icon={<BanIcon size={20} />} label="금지구역" onClick={p.onFishingZones} />
          <Quick
            icon={<RulerIcon size={20} />}
            label="금어기"
            badge={p.closedThisMonthCount > 0 ? p.closedThisMonthCount : undefined}
            onClick={p.onRegulations}
          />
          <Quick icon={<HookIcon size={20} />} label="루어 채비" onClick={p.onTackle} />
          <Quick icon={<BookIcon size={20} />} label="낚시 가이드" onClick={p.onGuide} />
        </div>
      </div>

      <p className={styles.note}>
        체험판은 기능을 맛보기 위한 것이라 일부가 제한됩니다. 글쓰기·결과 저장·내 손 크기 저장은 로그인해야 쓸 수 있어요.
      </p>
    </section>
  );
}

function BigCard({ icon, title, desc, action, onClick }: {
  icon: ReactNode; title: string; desc: string; action: string; onClick: () => void;
}) {
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <span className={styles.cardTop}>
        <span className={styles.cardIcon}>{icon}</span>
        <span className={styles.cardText}>
          <span className={styles.cardTitle}>{title}</span>
          <span className={styles.cardDesc}>{desc}</span>
        </span>
      </span>
      <span className={styles.cardRule} />
      <span className={styles.cardFoot}>
        <span>{action}</span>
        <ChevronRightIcon size={16} />
      </span>
    </button>
  );
}

function Quick({ icon, label, badge, onClick }: {
  icon: ReactNode; label: ReactNode; badge?: number; onClick: () => void;
}) {
  return (
    <button type="button" className={styles.quickItem} onClick={onClick}>
      <span className={styles.quickIcon}>
        {icon}
        {badge != null && <span className={styles.quickBadge}>{badge}</span>}
      </span>
      <span className={styles.quickLabel}>{label}</span>
    </button>
  );
}
