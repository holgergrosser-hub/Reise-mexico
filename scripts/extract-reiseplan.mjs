import fs from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';

const repoRoot = path.resolve(process.cwd());
const inputArg = process.argv[2] ? path.resolve(process.argv[2]) : null;
const rootDocx = path.join(repoRoot, 'Reiseplan_Mexiko__1_.docx');
const publicDocx = path.join(repoRoot, 'public', 'Reiseplan_Mexiko__1_.docx');
const inputPath = inputArg || (fs.existsSync(publicDocx) ? publicDocx : rootDocx);
const outputPath = path.join(repoRoot, 'src', 'reiseplan-text.json');

function normalizeLinesToParagraphs(rawText) {
  const text = String(rawText ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');

  const paragraphs = [];
  for (const line of lines) {
    const trimmed = line.replace(/\s+/g, ' ').trim();
    if (!trimmed) continue;
    paragraphs.push(trimmed);
  }

  return paragraphs;
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ DOCX nicht gefunden: ${inputPath}`);
    process.exit(1);
  }

  const result = await mammoth.extractRawText({ path: inputPath });
  const paragraphs = normalizeLinesToParagraphs(result.value);

  const payload = { paragraphs };
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log(`✅ Extrahiert: ${paragraphs.length} Zeilen/Absätze`);
  console.log(`➡️  Input:  ${inputPath}`);
  console.log(`➡️  Output: ${outputPath}`);

  if (result.messages?.length) {
    console.log(`ℹ️  Mammoth Hinweise: ${result.messages.length}`);
    for (const msg of result.messages.slice(0, 10)) {
      console.log(`- ${msg.type}: ${msg.message}`);
    }
  }
}

main().catch((err) => {
  console.error('❌ Extract fehlgeschlagen:', err);
  process.exit(1);
});
