// SVG 물고기 일러스트 - 각 어종의 실제 외형 기반

export function FlatfishSVG({ className }: { className?: string }) {
  // 광어 (Olive Flounder) - 납작한 타원형 몸통, 갈색/올리브, 등에 암점
  return (
    <svg viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* 몸통 */}
      <path
        d="M18,45 Q32,17 80,15 Q125,14 142,45 Q125,76 80,75 Q32,73 18,45 Z"
        fill="#B8915A"
      />
      {/* 배쪽 밝은 부분 */}
      <path
        d="M22,50 Q80,78 138,52"
        stroke="none" fill="#D4B07A" opacity="0.45"
      />
      {/* 등쪽 어두운 부분 */}
      <ellipse cx="80" cy="30" rx="55" ry="13" fill="#7A5A28" opacity="0.4" />
      {/* 암점 패턴 */}
      <circle cx="58" cy="40" r="6" fill="#5A3A10" opacity="0.6" />
      <circle cx="78" cy="50" r="5" fill="#5A3A10" opacity="0.5" />
      <circle cx="98" cy="40" r="5.5" fill="#5A3A10" opacity="0.5" />
      <circle cx="116" cy="50" r="4" fill="#5A3A10" opacity="0.4" />
      <circle cx="50" cy="53" r="3.5" fill="#5A3A10" opacity="0.4" />
      <circle cx="70" cy="57" r="3" fill="#5A3A10" opacity="0.35" />
      {/* 등지느러미 (긴 연속 지느러미) */}
      <path
        d="M20,42 Q80,6 140,40"
        stroke="#7A5A28" strokeWidth="4.5" fill="none" strokeLinecap="round"
      />
      {/* 꼬리지느러미 */}
      <path d="M140,45 L158,28 L158,62 Z" fill="#9A7040" />
      {/* 뒷지느러미 */}
      <path
        d="M20,48 Q80,82 140,50"
        stroke="#9A7040" strokeWidth="3.5" fill="none" strokeLinecap="round"
      />
      {/* 가슴지느러미 */}
      <ellipse cx="36" cy="54" rx="13" ry="6" fill="#9A7040" transform="rotate(-20 36 54)" opacity="0.85" />
      {/* 눈 */}
      <circle cx="22" cy="40" r="7" fill="#F5F0E8" />
      <circle cx="22" cy="40" r="5" fill="#1A1A1A" />
      <circle cx="22" cy="40" r="2.5" fill="#0A0A0A" />
      <circle cx="24" cy="38" r="1.5" fill="white" opacity="0.85" />
      {/* 아가미선 */}
      <path d="M30,32 Q35,45 30,58" stroke="#7A5A28" strokeWidth="2" fill="none" />
      {/* 입 */}
      <path d="M7,46 Q13,53 19,49" stroke="#7A5A28" strokeWidth="2" fill="none" />
      {/* 측선 */}
      <path
        d="M32,38 Q85,32 138,46"
        stroke="#7A5A28" strokeWidth="1" fill="none" strokeDasharray="5,4" opacity="0.5"
      />
    </svg>
  );
}

export function BlackPorgySVG({ className }: { className?: string }) {
  // 감성돔 (Black Seabream) - 높고 둥근 몸통, 은흑색, 등 짙고 배 밝음
  return (
    <svg viewBox="0 0 155 120" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* 몸통 - 높은 타원 */}
      <ellipse cx="72" cy="65" rx="54" ry="42" fill="#6B7280" />
      {/* 배 밝은 부분 */}
      <path d="M26,72 Q72,105 118,72" fill="#C0C8D0" opacity="0.5" />
      {/* 등 어두운 부분 */}
      <path d="M24,58 Q72,28 120,58" fill="#2D3748" opacity="0.65" />
      {/* 꼬리자루 부분 어두움 */}
      <ellipse cx="110" cy="65" rx="14" ry="20" fill="#374151" opacity="0.5" />
      {/* 등지느러미 - 가시부 + 연조부 */}
      <path
        d="M28,52 L33,30 L40,46 L47,24 L55,42 L63,20 L71,38 L80,18 L87,36 L96,26 L103,44 L112,38 L118,52"
        stroke="#1F2937" strokeWidth="2" fill="#374151" strokeLinejoin="round"
      />
      {/* 꼬리지느러미 - 갈라진 형태 */}
      <path d="M122,65 L142,44 Q148,54 142,65 L122,65 Z" fill="#374151" />
      <path d="M122,65 L142,65 Q148,76 142,86 L122,65 Z" fill="#374151" />
      {/* 가슴지느러미 */}
      <ellipse cx="38" cy="74" rx="15" ry="8" fill="#4B5563" transform="rotate(8 38 74)" opacity="0.9" />
      {/* 배지느러미 */}
      <path d="M56,100 L52,114 L64,102 Z" fill="#374151" />
      {/* 뒷지느러미 */}
      <path d="M80,103 L86,116 L110,103 Z" fill="#374151" />
      {/* 눈 */}
      <circle cx="30" cy="58" r="9" fill="#E8E0D0" />
      <circle cx="30" cy="58" r="6.5" fill="#111" />
      <circle cx="30" cy="58" r="3.5" fill="#050505" />
      <circle cx="32" cy="56" r="2" fill="white" opacity="0.85" />
      {/* 아가미덮개 */}
      <path d="M38,44 Q44,58 38,74" stroke="#1F2937" strokeWidth="2.5" fill="none" />
      {/* 입 */}
      <path d="M14,63 Q22,70 28,66" stroke="#1F2937" strokeWidth="2" fill="none" />
      {/* 측선 */}
      <path
        d="M40,50 Q88,44 120,62"
        stroke="#1F2937" strokeWidth="1.2" fill="none" opacity="0.4"
      />
      {/* 비늘 음영 (수직선) */}
      <path d="M80,36 Q84,65 80,94" stroke="#4B5563" strokeWidth="0.8" fill="none" opacity="0.3" />
      <path d="M96,34 Q100,65 96,96" stroke="#4B5563" strokeWidth="0.8" fill="none" opacity="0.25" />
    </svg>
  );
}

export function RockfishSVG({ className }: { className?: string }) {
  // 우럭 (Korean Rockfish) - 두툼한 몸, 큰 머리, 위를 향한 큰 입, 뾰족한 등지느러미
  return (
    <svg viewBox="0 0 165 105" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* 몸통 - 앞쪽 두툼 */}
      <path
        d="M14,52 Q26,20 68,18 Q110,18 135,36 Q150,46 150,52 Q150,58 135,68 Q110,86 68,86 Q26,84 14,52 Z"
        fill="#6B5A3E"
      />
      {/* 어두운 반점 패턴 */}
      <path d="M28,36 Q52,24 72,30 Q56,36 38,48 Z" fill="#3D2A10" opacity="0.38" />
      <path d="M82,46 Q108,34 128,42 Q116,52 94,58 Z" fill="#3D2A10" opacity="0.28" />
      <path d="M55,62 Q78,55 98,64 Q82,74 60,72 Z" fill="#3D2A10" opacity="0.32" />
      {/* 배 밝은 부분 */}
      <path d="M18,58 Q68,85 138,62" fill="#A08060" opacity="0.4" />
      {/* 등지느러미 - 가시부 (뾰족함) */}
      <path
        d="M34,20 L37,6 L44,18 L51,4 L59,17 L67,4 L74,17 L82,7 L89,19 L97,11 L105,24 L114,18 L123,30 L132,24 L140,36"
        stroke="#2D1A08" strokeWidth="2" fill="#4B3820" strokeLinejoin="round"
      />
      {/* 꼬리지느러미 */}
      <path d="M148,52 L162,38 Q167,52 162,66 L148,52 Z" fill="#4B3820" />
      {/* 가슴지느러미 - 크고 부채형 */}
      <path d="M42,56 Q26,44 22,66 Q34,78 46,66 Z" fill="#4B3820" opacity="0.9" />
      {/* 배지느러미 */}
      <path d="M56,82 L52,96 L64,84 Z" fill="#4B3820" />
      {/* 뒷지느러미 */}
      <path d="M92,84 L89,97 L115,84 Z" fill="#4B3820" />
      {/* 머리 이마 굴곡 */}
      <path d="M14,52 Q20,34 36,26" stroke="#2D1A08" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* 눈 - 크고 금빛 */}
      <circle cx="26" cy="44" r="10" fill="#F5F0E8" />
      <circle cx="26" cy="44" r="7.5" fill="#E8B830" />
      <circle cx="26" cy="44" r="4.5" fill="#0A0A0A" />
      <circle cx="27.5" cy="42" r="1.8" fill="white" opacity="0.9" />
      {/* 눈 위 가시 */}
      <path d="M22,35 L19,26 M28,33 L28,24" stroke="#2D1A08" strokeWidth="1.5" strokeLinecap="round" />
      {/* 아가미덮개 (가시 포함) */}
      <path d="M34,28 Q42,44 34,60" stroke="#2D1A08" strokeWidth="2.5" fill="none" />
      <path d="M36,28 L40,22" stroke="#2D1A08" strokeWidth="1.5" strokeLinecap="round" />
      {/* 큰 입 - 위를 향함 */}
      <path d="M6,54 Q13,62 22,56 Q13,46 6,54 Z" fill="#1A0E04" />
      <path d="M6,54 Q13,46 20,50" stroke="#2D1A08" strokeWidth="1.5" fill="none" />
      {/* 측선 */}
      <path
        d="M40,38 Q95,30 146,50"
        stroke="#2D1A08" strokeWidth="1" fill="none" strokeDasharray="4,3" opacity="0.3"
      />
    </svg>
  );
}

export function SeabassSVG({ className }: { className?: string }) {
  // 농어 (Japanese Seabass) - 유선형, 은빛, 두 개의 등지느러미, 갈라진 꼬리
  return (
    <svg viewBox="0 0 185 90" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* 몸통 - 유선형 */}
      <path
        d="M14,45 Q28,18 85,16 Q135,16 158,36 Q170,41 170,45 Q170,49 158,54 Q135,74 85,74 Q28,72 14,45 Z"
        fill="#A8B8C8"
      />
      {/* 배 밝은 은색 */}
      <path d="M18,52 Q85,78 158,52" fill="#E0E8F0" opacity="0.55" />
      {/* 등 짙은 부분 */}
      <path d="M18,38 Q85,18 158,38" fill="#3A4A5A" opacity="0.55" />
      {/* 첫 번째 등지느러미 - 가시부 */}
      <path
        d="M44,20 L47,6 L55,18 L63,5 L72,18 L81,6 L89,19 L97,8 L104,21"
        stroke="#1E2A38" strokeWidth="2" fill="#4A5A6A" strokeLinejoin="round"
      />
      {/* 두 번째 등지느러미 - 연조부 */}
      <path
        d="M107,21 Q122,16 142,28"
        stroke="#1E2A38" strokeWidth="4" fill="none" strokeLinecap="round"
      />
      {/* 꼬리지느러미 - 크게 갈라짐 */}
      <path d="M164,45 L182,22 Q185,33 180,45 L164,45 Z" fill="#4A5A6A" />
      <path d="M164,45 L180,45 Q185,57 182,68 L164,45 Z" fill="#4A5A6A" />
      {/* 가슴지느러미 */}
      <ellipse cx="38" cy="54" rx="16" ry="8" fill="#8090A0" transform="rotate(-12 38 54)" opacity="0.9" />
      {/* 배지느러미 */}
      <path d="M62,70 L57,84 L70,72 Z" fill="#4A5A6A" />
      {/* 뒷지느러미 */}
      <path d="M108,72 Q120,82 142,70" stroke="#4A5A6A" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* 눈 */}
      <circle cx="24" cy="42" r="8" fill="#F0EDE8" />
      <circle cx="24" cy="42" r="5.5" fill="#222" />
      <circle cx="24" cy="42" r="3" fill="#101010" />
      <circle cx="26" cy="40" r="2" fill="white" opacity="0.85" />
      {/* 아가미덮개 */}
      <path d="M34,28 Q41,44 34,60" stroke="#1E2A38" strokeWidth="2.5" fill="none" />
      {/* 입 */}
      <path d="M9,46 Q17,53 22,49" stroke="#1E2A38" strokeWidth="2" fill="none" />
      {/* 측선 - 완만한 곡선 */}
      <path
        d="M36,34 Q100,28 162,44"
        stroke="#1E2A38" strokeWidth="1.5" fill="none" opacity="0.5"
      />
      {/* 비늘선 (수직 곡선) */}
      <path d="M55,24 Q60,45 55,68" stroke="#8090A0" strokeWidth="0.6" fill="none" opacity="0.3" />
      <path d="M75,21 Q80,45 75,70" stroke="#8090A0" strokeWidth="0.6" fill="none" opacity="0.28" />
      <path d="M95,20 Q100,45 95,70" stroke="#8090A0" strokeWidth="0.6" fill="none" opacity="0.26" />
      <path d="M115,21 Q120,45 115,70" stroke="#8090A0" strokeWidth="0.6" fill="none" opacity="0.24" />
      <path d="M135,24 Q140,45 135,68" stroke="#8090A0" strokeWidth="0.6" fill="none" opacity="0.22" />
    </svg>
  );
}
