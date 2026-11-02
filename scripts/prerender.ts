/**
 * 빌드 후 공개 콘텐츠 페이지의 HTML을 미리 만들어 둔다.
 *
 * **왜 필요한가.** 이 앱은 SPA 라서 어느 주소로 들어와도 서버는 `index.html`
 * 하나만 준다. 본문은 자바스크립트가 돈 뒤에 생긴다. 크롤러는 그 전 단계만
 * 보고 가므로 34개 주소가 전부 "제목만 같고 본문 없는 같은 페이지"로 기록된다.
 * 2026-11-02 AdSense 반려 사유 `게시자 콘텐츠가 없는 화면에 Google 게재 광고`
 * 가 정확히 이 상태다.
 *
 * **무엇을 하는가.** `src/data/*.ts` (API 호출이 없는 정적 데이터)를 읽어
 * 경로별로 `dist/<경로>/index.html` 을 만든다. 각 파일은 `dist/index.html` 과
 * 같지만 `<title>`·`<meta description>`·`<div id="root">` 안이 그 페이지 내용으로
 * 채워져 있다.
 *
 * **런타임에 영향이 없다.** `main.tsx` 는 `createRoot().render()` 를 쓴다
 * (`hydrateRoot` 가 아니다) — React 가 마운트하면서 `#root` 안을 통째로 새로
 * 그리므로 hydration 불일치가 발생할 수 없다. 미리 넣은 HTML 은 자바스크립트가
 * 돌기 전까지만 보이고, 그래서 첫 화면이 오히려 빨라진다.
 *
 * **대상에서 뺀 것.**
 *   · `/tackle`        — 본문이 `api/tackleApi` 응답이라 빌드 시점에 없다
 *   · `/regulations`   — `useFishRegulations` (API) 에 의존한다
 *   · `/`, 게시판, 지도 — 로그인·API 의존. 애초에 광고도 안 붙는 화면이다
 *   두 곳은 API 가 느리거나 죽으면 여전히 빈 화면이 된다. 서버 렌더링을
 *   붙이지 않는 한 이 스크립트로는 해결할 수 없다.
 *
 * ⚠ 데이터 파일에 `import` 가 생기면 (특히 React·CSS) Vite 설정 번들이
 *   깨진다. `guides.ts`·`about.ts`·`speciesCompares.ts` 는 의존성이 없어야 한다.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { GUIDES } from '../src/data/guides';
import { ABOUT_ITEMS } from '../src/data/about';
import { SPECIES_COMPARES } from '../src/data/speciesCompares';

/** canonical 에 쓰는 사이트 주소. 도메인을 옮기면 여기만 고친다. */
const SITE = 'https://walking-hook-front.vercel.app';

/** `usePageMeta.ts` 의 값과 반드시 같아야 한다. 다르면 JS 가 돌면서 제목이 튄다. */
const TITLE_SUFFIX = ' | 워킹 훅';

interface Page {
  /** 선행 슬래시 포함. 예: `/guide/tide` */
  path: string;
  /** 접미사(` | 워킹 훅`)를 붙이기 전 제목 */
  title: string;
  description: string;
  body: string;
}

// ─────────────────────────────── HTML 유틸 ───────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 데이터에 쓰인 `**강조**` 를 살린다. 이스케이프 뒤에 적용한다. */
function inline(s: string): string {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function p(text: string): string {
  return `<p>${inline(text)}</p>`;
}

function list(items: string[], ordered = false): string {
  if (!items.length) return '';
  const tag = ordered ? 'ol' : 'ul';
  return `<${tag}>${items.map((i) => `<li>${inline(i)}</li>`).join('')}</${tag}>`;
}

function table(head: string[], rows: string[][]): string {
  const th = head.map((h) => `<th scope="col">${inline(h)}</th>`).join('');
  const tr = rows
    .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

function sources(items: { label: string; url: string }[]): string {
  if (!items.length) return '';
  const li = items
    .map((s) => `<li><a href="${esc(s.url)}" rel="nofollow noopener">${inline(s.label)}</a></li>`)
    .join('');
  return `<h2>참고 자료</h2><ul>${li}</ul>`;
}

/**
 * `usePageMeta.trim()` 과 같은 규칙. 검색 결과에서 잘리지 않게 160자 근처에서 끊는다.
 * 규칙이 어긋나면 크롤러가 읽은 설명과 JS 가 넣는 설명이 달라진다.
 */
function trim(text: string): string {
  const flat = text.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  return flat.length <= 160 ? flat : `${flat.slice(0, 157)}…`;
}

// ───────────────────────────── 페이지 본문 ─────────────────────────────

function guidePage(g: (typeof GUIDES)[number]): Page {
  const parts = [`<h1>${inline(g.title)}</h1>`, p(g.summary)];
  parts.push(`<p>${inline(g.category)} · 읽는 데 약 ${g.readMinutes}분 · ${inline(g.updatedAt)} 기준</p>`);

  for (const s of g.sections) {
    parts.push(`<h2>${inline(s.heading)}</h2>`);
    for (const para of s.paragraphs ?? []) parts.push(p(para));
    if (s.list) parts.push(list(s.list));
    if (s.table) parts.push(table(s.table.head, s.table.rows));
    if (s.callout) parts.push(`<blockquote>${inline(s.callout)}</blockquote>`);
    // 영상은 제목만 둔다. 링크를 모아 두면 "남의 콘텐츠 모음"으로 읽히므로
    // 우리가 쓴 글이 본문의 대부분이어야 한다.
    for (const v of s.videos ?? []) {
      if (v.note) parts.push(p(v.note));
    }
  }

  parts.push(sources(g.sources));
  return { path: `/guide/${g.slug}`, title: g.title, description: g.summary, body: parts.join('\n') };
}

function aboutPage(a: (typeof ABOUT_ITEMS)[number]): Page {
  const parts = [`<h1>${inline(a.title)}</h1>`];
  if (a.lead) parts.push(p(a.lead));
  parts.push(p(a.summary));

  for (const s of a.sections ?? []) {
    parts.push(`<h2>${inline(s.heading)}</h2>`);
    for (const para of s.paragraphs ?? []) parts.push(p(para));
    if (s.steps) parts.push(list(s.steps, true));
    if (s.callout) parts.push(`<blockquote>${inline(s.callout)}</blockquote>`);
    for (const shot of s.shots ?? []) {
      if (shot.caption) parts.push(`<p>${inline(shot.caption)}</p>`);
    }
  }

  return { path: `/about/${a.slug}`, title: a.title, description: a.lead ?? a.summary, body: parts.join('\n') };
}

function comparePage(c: (typeof SPECIES_COMPARES)[number]): Page {
  const parts = [`<h1>${inline(c.title)} 구별법</h1>`, p(`한 줄로: ${c.decisive}`)];
  if (c.why) parts.push(p(c.why));

  parts.push('<h2>왜 갈라야 하는가</h2>');
  parts.push(
    list(c.entries.map((e) => (e.rule ? `${e.name} — ${e.rule}` : e.name))),
  );

  parts.push('<h2>나란히 놓고 보기</h2>');
  parts.push(
    table(
      ['구분', ...c.entries.map((e) => e.name)],
      c.rows.map((r) => [r.decisive ? `${r.label} (결정적)` : r.label, ...r.values]),
    ),
  );

  if (c.note) parts.push(`<blockquote>${inline(c.note)}</blockquote>`);
  if (c.sources.length) {
    parts.push(`<h2>참고 자료</h2>${list(c.sources)}`);
  }

  const desc = c.why ? `${c.decisive}. ${c.why}` : c.decisive;
  return { path: `/compare/${c.id}`, title: `${c.title} 구별법`, description: desc, body: parts.join('\n') };
}

/** 목록 페이지. 상세로 가는 링크를 둬서 크롤러가 따라갈 수 있게 한다. */
function indexPage(
  path: string,
  title: string,
  description: string,
  items: { href: string; title: string; summary: string }[],
): Page {
  const body = [
    `<h1>${inline(title)}</h1>`,
    p(description),
    `<ul>${items
      .map(
        (i) =>
          `<li><a href="${esc(i.href)}">${inline(i.title)}</a> — ${inline(i.summary)}</li>`,
      )
      .join('')}</ul>`,
  ].join('\n');
  return { path, title, description, body };
}

export function buildPages(): Page[] {
  const guides = GUIDES.map(guidePage);
  // `slug` 가 없는 항목은 상세 페이지가 없다 (`href` 로 기능으로 바로 보낸다).
  const abouts = ABOUT_ITEMS.filter((a) => a.slug).map(aboutPage);
  const compares = SPECIES_COMPARES.map(comparePage);

  return [
    indexPage(
      '/guide',
      '낚시 가이드',
      '물때·바람·파고 읽는 법부터 안전 수칙까지, 로그인 없이 읽을 수 있는 바다낚시 가이드입니다.',
      GUIDES.map((g) => ({ href: `/guide/${g.slug}`, title: g.title, summary: g.summary })),
    ),
    ...guides,
    indexPage(
      '/about',
      '서비스 소개',
      '워킹 훅이 무엇을 하는 서비스인지, 각 기능을 어떻게 쓰는지 정리했습니다.',
      ABOUT_ITEMS.filter((a) => a.slug).map((a) => ({
        href: `/about/${a.slug}`,
        title: a.title,
        summary: a.summary,
      })),
    ),
    ...abouts,
    indexPage(
      '/compare',
      '헷갈리는 어종 구별',
      '닮은 종끼리 금어기와 금지체장이 다릅니다. 나란히 놓고 결정적인 형질만 짚었습니다.',
      SPECIES_COMPARES.map((c) => ({
        href: `/compare/${c.id}`,
        title: c.title,
        summary: c.decisive,
      })),
    ),
    ...compares,
  ];
}

// ─────────────────────────────── 쓰기 ───────────────────────────────

/**
 * `<meta>` 를 통째로 갈아끼운다. `index.html` 의 description 처럼 여러 줄에
 * 걸친 태그도 잡으려고 `[\s\S]` 를 쓴다. 없으면 `</head>` 앞에 새로 넣는다.
 */
function setMeta(html: string, attr: 'name' | 'property', key: string, content: string): string {
  const tag = `<meta ${attr}="${key}" content="${esc(content)}" />`;
  const re = new RegExp(`<meta\\s+${attr}="${key}"[\\s\\S]*?/>`);
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `${tag}\n  </head>`);
}

function render(template: string, page: Page): string {
  const fullTitle = `${page.title}${TITLE_SUFFIX}`;
  const desc = trim(page.description);

  let html = template.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(fullTitle)}</title>`);
  html = setMeta(html, 'name', 'description', desc);
  html = setMeta(html, 'property', 'og:title', fullTitle);
  html = setMeta(html, 'property', 'og:description', desc);

  // canonical — 같은 내용이 여러 주소로 잡히는 것을 막는다.
  const canonical = `<link rel="canonical" href="${esc(SITE + page.path)}" />`;
  html = /<link\s+rel="canonical"[\s\S]*?\/>/.test(html)
    ? html.replace(/<link\s+rel="canonical"[\s\S]*?\/>/, canonical)
    : html.replace('</head>', `${canonical}\n  </head>`);

  // 본문. React 가 마운트하면서 통째로 교체한다.
  const injected = `<div id="root"><main>${page.body}</main></div>`;
  const rootRe = /<div id="root">[\s\S]*?<\/div>/;
  if (!rootRe.test(html)) {
    throw new Error('index.html 에서 <div id="root"></div> 를 찾지 못했습니다.');
  }
  return html.replace(rootRe, injected);
}

export function writePrerendered(distDir: string): string[] {
  const templatePath = join(distDir, 'index.html');
  const template = readFileSync(templatePath, 'utf8');
  const written: string[] = [];

  for (const page of buildPages()) {
    const out = join(distDir, page.path.replace(/^\//, ''), 'index.html');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, render(template, page), 'utf8');
    written.push(out);
  }
  return written;
}

/** Vite 플러그인. `closeBundle` 은 dist 가 다 쓰인 뒤에 돈다. */
export function prerender() {
  return {
    name: 'walking-hook-prerender',
    apply: 'build' as const,
    closeBundle() {
      const files = writePrerendered('dist');
      console.log(`\n[prerender] ${files.length}개 페이지 생성`);
    },
  };
}
