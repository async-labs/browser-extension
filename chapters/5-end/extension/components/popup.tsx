// globals.d.ts
declare const $: any;

import React from 'react';

const Popup = (props: any) => {
  const { content, onClose, size } = props;

  let width = '50%';

  if (size === 'small') {
    width = '20%';
  }

  if (size === 'medium') {
    width = '30%';
  }

  return (
    <div className="popup">
      <div className="popup-content" style={{ width }}>
        <span className="close" onClick={onClose}>
          &times;
        </span>
        {content}
      </div>
    </div>
  );
};

export default Popup;