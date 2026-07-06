/** 겟꿀 로더 — 🍯 픽토그램이 흑백→컬러로 바닥부터 차오르는 로딩 인디케이터. 스타일은 globals.css. */
export default function GetkkulLoader() {
  return (
    <div className="gk-loader" role="status" aria-label="불러오는 중">
      <span className="gk-loader__base" aria-hidden>
        🍯
      </span>
      <span className="gk-loader__fill" aria-hidden>
        🍯
      </span>
    </div>
  );
}
