# Release Process

## Manual Steps

1. Update version in `package.json` and `package-lock.json`
2. Add release entry in `CHANGELOG.md` with changes
3. Commit with co-author footer:
   ```
   Release vX.Y.Z

   -m "Ultraworked with Sisyphus"
   -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
   ```
4. Tag: `git tag vX.Y.Z`

## Automated Script

```bash
./scripts/release.sh X.Y.Z
```

Then edit `CHANGELOG.md`, commit, and tag.

## Version History

- 0.1.6 - Fix image `typora-root-url` prefix lost after note tag with title
