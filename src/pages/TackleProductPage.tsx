import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/common/Header';
import TackleThumb from '../components/tackle/TackleThumb';
import { useAdContent } from '../components/common/AdContent';
import { usePageMeta } from '../lib/usePageMeta';
import {
  fetchTackleProduct, seaLabel, SPEC_LABELS, TIER_LABELS, type TackleProduct,
} from '../api/tackleApi';
import styles from './TackleProductPage.module.css';

/**
 * 루어 채비 제품 상세. 쿠팡 링크는 이 화면에서만 연다 — 목록에서 바로 나가면 오탭이 그대로 이탈이 된다.
 *
 * 링크는 받은 그대로 새 탭으로 연다. `sponsored` 를 빠뜨리면 검색 노출에서 불이익을 볼 수 있고,
 * 자체 도메인 리다이렉트로 감싸면 클로킹으로 볼 소지가 있어 하지 않는다.
 * 대가성 고지는 링크 버튼 바로 위(공정위 추천·보증 심사지침).
 */
export default function TackleProductPage() {
  const { id = '' } = useParams();
  const [product, setProduct] = useState<TackleProduct | null>(null);
  const [error, setError] = useState(false);

  // 광고는 본문이 있을 때만 (애드센스 정책 — AdContent.tsx)
  useAdContent(!!product);
  usePageMeta(product ? `${product.name} — 루어 채비` : '루어 채비', product?.summary ?? undefined);

  useEffect(() => {
    let alive = true;
    setProduct(null);
    setError(false);
    fetchTackleProduct(id)
      .then((p) => { if (alive) setProduct(p); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [id]);

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <Link to="/tackle" className={styles.back}>← 루어 채비로</Link>

        {error && <p className={styles.empty}>제품을 찾을 수 없습니다. 내려간 제품일 수 있어요.</p>}
        {!error && !product && <p className={styles.empty}>불러오는 중…</p>}

        {product && (
          <article className={styles.card}>
            <div className={styles.thumbWrap}>
              <TackleThumb src={product.imageUrl} size={220} alt={product.name} />
            </div>

            <div className={styles.tags}>
              <span className={styles.tagSpec}>{SPEC_LABELS[product.specKey]}</span>
              <span className={styles.tagTier}>{TIER_LABELS[product.tier]}</span>
              <span className={styles.tagSea}>{seaLabel(product.sea)}</span>
            </div>

            <h1 className={styles.name}>{product.name}</h1>
            {product.summary && <p className={styles.summary}>{product.summary}</p>}

            <dl className={styles.attrs}>
              <div className={styles.attr}>
                <dt>가격대</dt>
                <dd>{product.priceBand}</dd>
              </div>
              {(product.attrs ?? []).map((a) => (
                <div key={a.label} className={styles.attr}>
                  <dt>{a.label}</dt>
                  <dd>{a.value}</dd>
                </div>
              ))}
            </dl>

            {product.reason && (
              <section className={styles.reason}>
                <h2>이 제품을 넣은 이유</h2>
                <p>{product.reason}</p>
              </section>
            )}

            <p className={styles.disclosure}>
              이 화면에는 쿠팡 파트너스 링크가 포함되어 있으며, 구매 시 일정액의 수수료를 받습니다.
            </p>

            {product.linkUrl && (
              <a
                className={styles.buy}
                href={product.linkUrl}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
              >
                쿠팡에서 보기
              </a>
            )}

            <p className={styles.note}>
              가격·재고는 쿠팡에서 바뀔 수 있습니다{product.checkedAt ? ` · ${product.checkedAt} 확인` : ''}
            </p>
          </article>
        )}
      </main>
    </div>
  );
}
