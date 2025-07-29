# Quy trình release kết hợp changlogen và Gihub Actions

## Mục tiêu
- Dùng changlogen để:
  - Sinh ra CHANGELOG.md tự động từ commit messages
  - Tăng version tự động
  - Tạo git tag
- Dùng github actions để:
  - Build extension
  - Tạo file zip
  - Tạo Github release với changelog và file zip đính kèm.

## Các bước thực hiện

### 1. Thêm script trong `package.json`

```json
{
  "scripts": {
    "release": "changelogen --release",
  }
}
```
Lệnh này sẽ sinh ra CHANGELOG.md, tăng version và tạo git tag.

### 2. Thiết lập Github Actions

Tạo file `.github/workflows/release.yml`, thực hiện các bước:

- Install dependencies (Node.js 20)
- `npm run release` với release type: Chạy script để sinh CHANGELOG.md và tăng version
- Push changes (version bump, changelog, tag) lên github (Config git user trước)
- Build extension & zip file, tên file dạng dạng `backlog-ai-ext_vX.Y.Z.zip`, file đặt trong thư mục `build/`
- Tạo Github release draft với tag mới, đính kèm file zip và nội dung changelog.

## 3. Chi tiết hướng dẫn implement

### 3.1. Thêm script release trong package.json

```json
{
  "scripts": {
    "release": "changelogen --release"
  }
}
```

### 3.2. Tạo GitHub Actions Workflow

Tạo file `.github/workflows/release.yml`:

```yaml
name: Release

on:
  workflow_dispatch:
    inputs:
      release_type:
        description: 'Release type'
        required: true
        default: 'patch'
        type: choice
        options:
          - patch
          - minor
          - major

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Configure Git
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"

      - name: Run type checking
        run: npm run lint

      - name: Generate changelog and bump version
        run: npm run release -- --${{ inputs.release_type }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Get new version
        id: version
        run: |
          VERSION=$(node -p "require('./package.json').version")
          echo "version=v$VERSION" >> $GITHUB_OUTPUT
          echo "version_number=$VERSION" >> $GITHUB_OUTPUT

      - name: Push changes and tags
        run: git push origin HEAD --follow-tags

      - name: Build extension for production
        run: npm run build

      - name: Create build directory
        run: mkdir -p build

      - name: Create extension zip
        run: |
          cd dist
          zip -r ../build/backlog-ai-ext_${{ steps.version.outputs.version }}.zip .
          cd ..

      - name: Verify zip file
        run: |
          echo "Created zip file:"
          ls -la build/
          echo "Zip contents:"
          unzip -l build/backlog-ai-ext_${{ steps.version.outputs.version }}.zip

      - name: Extract changelog for release
        id: changelog
        run: |
          VERSION=${{ steps.version.outputs.version_number }}
          echo "Extracting changelog for version $VERSION"
          
          # Get changelog content between the current version and the next version header
          awk "/^## \\[$VERSION\\]/{flag=1; next} /^## \\[/{flag=0} flag" CHANGELOG.md > release_notes.txt
          
          # If no specific version section found, get content from top until first version
          if [ ! -s release_notes.txt ]; then
            awk '/^## \[/{if(!found){found=1; next} else exit} found' CHANGELOG.md > release_notes.txt
          fi
          
          echo "Release notes content:"
          cat release_notes.txt

      - name: Create GitHub Release Draft
        uses: softprops/action-gh-release@v1
        with:
          tag_name: ${{ steps.version.outputs.version }}
          name: Release ${{ steps.version.outputs.version }}
          body_path: release_notes.txt
          files: |
            build/backlog-ai-ext_${{ steps.version.outputs.version }}.zip
          draft: true
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: extension-build-${{ steps.version.outputs.version }}
          path: |
            build/
            dist/
          retention-days: 30
```

### 3.3. Cách sử dụng

1. **Trigger release workflow:**
   - Vào GitHub repository → Actions tab
   - Chọn "Release" workflow
   - Click "Run workflow"
   - Chọn release type: patch, minor, hoặc major
   - Click "Run workflow"

2. **Review và publish:**
   - Workflow sẽ tạo release draft
   - Kiểm tra changelog và file zip đính kèm
   - Edit release notes nếu cần
   - Click "Publish release" để public

3. **Release types:**
   - **patch**: Bug fixes (1.0.0 → 1.0.1)
   - **minor**: New features (1.0.0 → 1.1.0)
   - **major**: Breaking changes (1.0.0 → 2.0.0)

### 3.4. Local testing

Để test locally trước khi release:

```bash
# Preview changelog
npx changelogen

# Test specific release type
npm run release -- --patch --dry-run
```
