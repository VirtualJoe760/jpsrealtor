import os
import re
from datetime import datetime
from pathlib import Path

# ─────────────────────────────────────────────
# 📁 DIRECTORIES
# ─────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[2]
TODAY = datetime.now().strftime("%Y-%m-%d")

BASE_DIR = PROJECT_ROOT / "local-logs" / "content" / "luxury-listings" / TODAY
SCRIPTS_DIR = BASE_DIR / "scripts"

# ─────────────────────────────────────────────
# 🧩 CLEAN FUNCTION
# ─────────────────────────────────────────────
def extract_script(text: str) -> str:
    """
    Cleans Ollama output into finalized property scripts.
    Removes formatting, commentary, and stage directions like (Show drone shot of pool).
    """
    # Remove any lead-in like "Here is the script:" or "Script for ..."
    text = re.sub(r"(?i)(here is|this is|generated script).*?:", "", text)
    text = re.sub(r"(?i)\*\*script for.*?\*\*", "", text)
    text = re.sub(r"(?i)^script for.*", "", text)

    # Strip markdown formatting
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"`", "", text)

    # Remove parenthetical stage directions (Show ...), (Cut to ...), etc.
    # Keep parentheses if they likely contain numbers or units like (2025) or (sqft)
    text = re.sub(r"\([^()]*[A-Za-z][^()]*\)", "", text)

    # Remove stray "Output"/"Example"/"JSON" lines
    text = re.sub(r"(?im)^(json|example|output).*", "", text)

    # Normalize spacing
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = text.strip()

    return text

# ─────────────────────────────────────────────
# 🚀 MAIN
# ─────────────────────────────────────────────
def main():
    txt_files = list(SCRIPTS_DIR.glob("*.txt"))
    if not txt_files:
        print(f"⚠️ No .txt files found in {SCRIPTS_DIR}")
        return

    for file in txt_files:
        with open(file, "r", encoding="utf-8") as f:
            raw_text = f.read()

        cleaned_text = extract_script(raw_text)
        if not cleaned_text:
            print(f"⚠️ No script content found in {file.name}")
            continue

        # Overwrite existing file directly
        with open(file, "w", encoding="utf-8") as f:
            f.write(cleaned_text + "\n")

        print(f"✅ Cleaned & overwritten → {file.name}")

    print(f"\n🧹 Cleanup complete! All scripts cleaned in: {SCRIPTS_DIR}")

# ─────────────────────────────────────────────
if __name__ == "__main__":
    main()
