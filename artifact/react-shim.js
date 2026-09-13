// 아티팩트 번들용: `import React from 'react'`를 CDN UMD 전역(window.React)으로 연결한다.
const R = window.React;
export default R;
export const { useState, useEffect, useRef, useMemo, useCallback, Fragment } = R;
