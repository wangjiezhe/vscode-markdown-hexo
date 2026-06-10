#!/usr/bin/env bash
set -euo pipefail

# Release script for vscode-markdown-hexo
# Usage: ./scripts/release.sh <version>
# Example: ./scripts/release.sh 0.1.7

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.1.7"
  exit 1
fi

VERSION="$1"
TAG="v$VERSION"
DATE=$(date +%Y-%m-%d)

# Validate version format
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "Error: Version must be in format X.Y.Z (e.g., 0.1.7)"
  exit 1
fi

# Ensure working directory clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory not clean. Commit or stash changes first."
  exit 1
fi

# Update version in package.json
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# Update version in package-lock.json
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package-lock.json

# Update CHANGELOG.md
CHANGELOG_FILE="CHANGELOG.md"
if grep -q "## \[Unreleased\]" "$CHANGELOG_FILE"; then
  # Create new release entry after Unreleased
  awk -v tag="$TAG" -v date="$DATE" '
    /## \[Unreleased\]/ {
      print
      print ""
      print "## [" tag "] - " date
      print ""
      print "### Added"
      print ""
      print "- TBD"
      print ""
      next
    }
    { print }
  ' "$CHANGELOG_FILE" > "${CHANGELOG_FILE}.tmp" && mv "${CHANGELOG_FILE}.tmp" "$CHANGELOG_FILE"
else
  echo "Error: No [Unreleased] section found in CHANGELOG.md"
  exit 1
fi

echo ""
echo "=== Changes prepared for $TAG ==="
echo "1. package.json version -> $VERSION"
echo "2. package-lock.json version -> $VERSION"
echo "3. CHANGELOG.md entry added"
echo ""
echo "Edit CHANGELOG.md to fill in release notes, then:"
echo "  git add package.json package-lock.json CHANGELOG.md"
echo "  git commit -m \"Release $TAG\""
echo "  git tag $TAG"
