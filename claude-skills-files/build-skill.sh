#!/bin/bash
# ==============================================================================
# build-skill.sh
# ==============================================================================
# Packages the P402 Claude Skill for distribution.
# Run from the project root: ./scripts/build-skill.sh
#
# Outputs:
#   public/downloads/p402.zip    - Zipped skill folder
#   public/downloads/p402.skill  - Same file, .skill extension for Claude.ai
#   public/llms-full.txt         - Concatenated skill files for LLM consumption
# ==============================================================================

set -euo pipefail

SKILL_DIR=".claude/skills/p402"
OUTPUT_DIR="public/downloads"
LLMS_FULL="public/llms-full.txt"

# Validate skill exists
if [ ! -f "${SKILL_DIR}/SKILL.md" ]; then
    echo "ERROR: ${SKILL_DIR}/SKILL.md not found. Run from project root."
    exit 1
fi

echo "=== Building P402 Skill Package ==="

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Package as zip
echo "[1/3] Packaging skill as zip..."
cd .claude/skills
zip -r "../../${OUTPUT_DIR}/p402.zip" p402/ -x '*.DS_Store' '*__pycache__*'
cd ../..

# Copy as .skill (same format, different extension for Claude.ai)
echo "[2/3] Creating .skill package..."
cp "${OUTPUT_DIR}/p402.zip" "${OUTPUT_DIR}/p402.skill"

# Generate llms-full.txt
echo "[3/3] Generating llms-full.txt..."
cat "${SKILL_DIR}/SKILL.md" > "${LLMS_FULL}"
echo -e "\n\n---\n" >> "${LLMS_FULL}"
cat "${SKILL_DIR}/references/api-reference.md" >> "${LLMS_FULL}"
echo -e "\n\n---\n" >> "${LLMS_FULL}"
cat "${SKILL_DIR}/references/routing-guide.md" >> "${LLMS_FULL}"
echo -e "\n\n---\n" >> "${LLMS_FULL}"
cat "${SKILL_DIR}/references/payment-flows.md" >> "${LLMS_FULL}"
echo -e "\n\n---\n" >> "${LLMS_FULL}"
cat "${SKILL_DIR}/references/a2a-protocol.md" >> "${LLMS_FULL}"

# Report
echo ""
echo "=== Build Complete ==="
echo "  ${OUTPUT_DIR}/p402.zip    $(du -h "${OUTPUT_DIR}/p402.zip" | cut -f1)"
echo "  ${OUTPUT_DIR}/p402.skill  $(du -h "${OUTPUT_DIR}/p402.skill" | cut -f1)"
echo "  ${LLMS_FULL}              $(wc -l < "${LLMS_FULL}") lines"
echo ""
echo "Skill files accessible at:"
echo "  https://p402.io/skill/p402.zip"
echo "  https://p402.io/skill/p402.skill"
echo "  https://p402.io/llms-full.txt"
