// encode6bit.js
const encode6bit = (b) => {
  if (b < 10) {
    return String.fromCharCode(48 + b);
  }
  b -= 10;
  if (b < 26) {
    return String.fromCharCode(65 + b);
  }
  b -= 26;
  if (b < 26) {
    return String.fromCharCode(97 + b);
  }
  b -= 26;
  if (b === 0) {
    return '-';
  }
  if (b === 1) {
    return '_';
  }
  return '?';
};
// append3bytes.js
const append3bytes = (b1, b2, b3) => {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3F;
  return encode6bit(c1 & 0x3F) + encode6bit(c2 & 0x3F) + encode6bit(c3 & 0x3F) + encode6bit(c4 & 0x3F);
};
// encode64.js
const encode64 = (data) => {
  if (!data) {
    return ''; // Return an empty string if data is empty or falsy
  }

  let r = "";
  for (let i = 0; i < data.length; i += 3) {
    const b1 = data[i];
    const b2 = data[i + 1];
    const b3 = data[i + 2];
    if (i + 2 === data.length) {
      r += append3bytes(b1, b2, 0);
    } else if (i + 1 === data.length) {
      r += append3bytes(b1, 0, 0);
    } else {
      r += append3bytes(b1, b2, b3);
    }
  }
  return r;
};
export default encode64;