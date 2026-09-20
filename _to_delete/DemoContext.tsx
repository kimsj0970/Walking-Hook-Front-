import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchDemoStatus } from '../api/demoApi';

/**
 * 웹 체험판(비로그인) 켜짐 여부 — 앱 전체가 한 번만 물어보고 나눠 쓴다.
 *
 * `loading` 이 필요한 이유: 라우트 게이트가 "아직 모름" 과 "꺼짐" 을 구분해야 한다.
 * 모르는 상태에서 꺼짐으로 취급하면 새로고침할 때마다 체험판 페이지가 로그인으로 튕긴다.
 */
interface DemoState {
  enabled: boolean;
  loading: boolean;
}

const DemoContext = createContext<DemoState>({ enabled: false, loading: true });

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>({ enabled: false, loading: true });

  useEffect(() => {
    let alive = true;
    fetchDemoStatus().then((enabled) => {
      if (alive) setState({ enabled, loading: false });
    });
    return () => { alive = false; };
  }, []);

  return <DemoContext.Provider value={state}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoState {
  return useContext(DemoContext);
}
