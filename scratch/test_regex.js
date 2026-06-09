const testCases = [
  'R 5 000,00',
  'R 5\u00a0000,00',
  'R 5\u202f000,00',
  'R 5,000.00',
  'R 5.000,00',
  'R 5000.00',
  'R 5000,00',
  'R 5000',
  'R 5,000',
  'R 5 000',
  'R 5 000,00 ',  // trailing space
  'R 5 000,00\r', // trailing CR
  'R 5 000,00\u00a0', // trailing non-breaking space
  'R 5 000.00 ',  // trailing space with dot
];

function parseCurrency(str) {
  if (typeof str !== 'string') return parseFloat(str) || 0;
  let s = str.trim();
  // Remove everything except digits, comma, dot, and minus
  s = s.replace(/[^0-9,.-]/g, '');
  
  const decIndex = s.length - 3;
  if (decIndex > 0 && (s[decIndex] === ',' || s[decIndex] === '.')) {
    const decSep = s[decIndex];
    const integerPart = s.substring(0, decIndex);
    const fractionalPart = s.substring(decIndex + 1);
    const cleanedInteger = integerPart.replace(/[,.]/g, '');
    return parseFloat(cleanedInteger + '.' + fractionalPart) || 0;
  }
  
  s = s.replace(/,/g, ''); // strip commas
  return parseFloat(s) || 0;
}

testCases.forEach(c => {
  console.log(`'${c}' -> parsed: ${parseCurrency(c)}`);
});
