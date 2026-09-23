/* 화면이 그려지다 터지면 빈 화면 대신 무엇이 터졌는지 보여 준다.
   (지금까지는 라커처럼 한 화면만 터져도 통째로 까맣게 비어 원인을 알 수 없었다) */
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null, info: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { this.setState({ info }); console.error('[화면 오류]', err, info); }

  render() {
    const { err, info } = this.state;
    if (!err) return this.props.children;
    const where = (info?.componentStack || '').trim().split('\n').slice(0, 6).join('\n');
    return (
      <div style={{ minHeight: '100dvh', background: '#05080f', color: '#e8ecf2', padding: 32, fontFamily: "'IBM Plex Sans KR',sans-serif" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fca5a5', margin: '0 0 6px' }}>화면을 그리다 멈춤</h1>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#9ca3af' }}>아래 내용 그대로 알려 주기</p>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'rgba(248,113,113,.08)', boxShadow: 'inset 0 0 0 1px rgba(248,113,113,.4)', padding: 16, fontSize: 13, lineHeight: 1.6, color: '#fecaca' }}>
          {String(err && (err.stack || err.message || err))}
          {where && `\n\n${where}`}
        </pre>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button type="button" onClick={() => window.location.reload()}
            style={{ padding: '10px 18px', background: '#e8ecf2', color: '#05080f', fontWeight: 800, border: 0, cursor: 'pointer' }}>다시 불러오기</button>
          <button type="button" onClick={() => { window.location.href = '/'; }}
            style={{ padding: '10px 18px', background: 'transparent', color: '#e8ecf2', fontWeight: 800, border: '1px solid rgba(255,255,255,.3)', cursor: 'pointer' }}>메인으로</button>
        </div>
      </div>
    );
  }
}
