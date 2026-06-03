const fs = require('fs');
const file = fs.readFileSync('node_modules/tech-stack-icons/dist/index.js', 'utf8');
const match = file.match(/const\s+typedIconsData\s*=\s*({[\s\S]*?});/);
if (match) {
  const keys = Object.keys(eval('('+match[1]+')'));
  console.log(keys.filter(k => /react|java|js|type|node|python|css|tailwind|figma|git|api|postman|sql|three|framer/.test(k)).join(', '));
} else {
  const matches = [...file.matchAll(/\"([a-z0-9]+)\"\s*:\s*\{\s*keywords/g)].map(m => m[1]);
  console.log(matches.filter(k => /react|java|js|type|node|python|css|tailwind|figma|git|api|postman|sql|three|framer/.test(k)).join(', '));
}
