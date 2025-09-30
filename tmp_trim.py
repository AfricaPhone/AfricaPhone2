from pathlib import Path

path = Path("src/types.ts")
text = path.read_text(encoding="utf-8")
text = text.rstrip('\n') + '\n'
path.write_text(text, encoding="utf-8")
