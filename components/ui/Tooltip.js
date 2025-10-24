// components/Tooltip.js
import React, { useState } from 'react';

export default function Tooltip({ children, content }) {
  const [show, setShow] = useState(false);

  return (
    <span
      style={tooltipStyles.wrapper}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && <span style={tooltipStyles.tooltip}>{content}</span>}
    </span>
  );
}

const tooltipStyles = {
  wrapper: {
    position: 'relative',
    display: 'inline-block',
    cursor: 'help',
    borderBottom: '1px dashed #ccc', // 툴팁이 있음을 시각적으로 표시
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%', // 위로 띄우기
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '10px', // 아이콘과 툴팁 사이 간격
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '5px 10px',
    borderRadius: '4px',
    fontSize: '0.8em',
    whiteSpace: 'nowrap',
    zIndex: 100,
    pointerEvents: 'none', // 툴팁 자체가 마우스 이벤트를 가로채지 않도록
    // 삼각형 꼬리 (선택 사항)
    '::after': {
      content: '""', // CSS 가상 요소는 JavaScript 객체에서 직접 정의하기 어려우므로, 이 부분은 별도의 CSS 파일 (globals.css 또는 모듈 CSS)에 추가하는 것이 좋습니다. 여기서는 주석 처리하거나, `content: '""'`까지만 남깁니다.
      // position: 'absolute',
      // top: '100%',
      // left: '50%',
      // marginLeft: '-5px',
      // borderWidth: '5px',
      // borderStyle: 'solid',
      // borderColor: 'rgba(0, 0, 0, 0.8) transparent transparent transparent',
    },
  },
};
