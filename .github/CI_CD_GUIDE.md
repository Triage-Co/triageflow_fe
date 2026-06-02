# CI/CD Setup Guide

## 📋 Overview

Dự án này được cấu hình với **GitHub Actions** cho CI/CD. Có 2 workflows chính:

### 1. **CI Pipeline** (`ci.yml`)
- ✅ Chạy trên push và pull requests
- ✅ Test với Node.js 20.x và 22.x (do Next.js 16 yêu cầu Node >= 20.9.0)
- ✅ Cài đặt dependencies (`npm ci`)
- ✅ Kiểm tra linting (`eslint`)
- ✅ Kiểm tra kiểu dữ liệu (`tsc --noEmit`)
- ✅ Kiểm tra build dự án (`npm run build`)
- ✅ Upload build artifacts (chỉ cho Node 20.x)

### 2. **Deploy to Vercel** (`deploy-vercel.yml`)
- 🛠️ Chỉ kích hoạt thủ công bằng nút **Run workflow** (workflow_dispatch)
- ❌ Đã tắt tự động deploy khi push hoặc pull request
- ✅ Hỗ trợ Production & Preview deployment tùy chọn

---

## 🚀 Cách Setup

### **Step 1: Tạo GitHub Secrets**

Đi tới **Settings → Secrets and variables → Actions** trong repository:

#### Cho Vercel deployment:
```
VERCEL_TOKEN         # Lấy từ Vercel account settings
VERCEL_ORG_ID        # Organization ID từ Vercel
VERCEL_PROJECT_ID    # Project ID từ Vercel
```

**Cách lấy Vercel credentials:**
1. Đi tới [Vercel Dashboard](https://vercel.com/dashboard)
2. Tạo account nếu chưa có
3. Import project từ GitHub
4. Lấy tokens từ **Settings → Tokens**

### **Step 2: Cấu hình Vercel (Optional)**

Tạo `vercel.json` trong root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "nodeVersion": "20.x"
}
```

---

## 📁 File Structure

```
.github/
├── workflows/
│   ├── ci.yml              # CI Pipeline workflow (Lint, Type Check, Build)
│   └── deploy-vercel.yml   # Deploy to Vercel
```

---

## 🔍 Workflow Details

### **CI Pipeline Workflow**

Trigger:
- Push đến `main`, `master`, `develop`
- Pull requests đến các nhánh này

Checks & Steps:
1. **Checkout code**: Lấy code từ repository.
2. **Setup Node.js**: Thiết lập môi trường chạy Node.js 20.x và 22.x.
3. **Install dependencies**: Chạy `npm ci` cài đặt chính xác các gói.
4. **Run ESLint**: Chạy `npm run lint` để kiểm tra lỗi code.
5. **Type checking**: Chạy `npx tsc --noEmit` kiểm tra kiểu TypeScript.
6. **Build project**: Chạy `npm run build` để kiểm tra cấu trúc build Next.js.
7. **Upload artifacts**: Upload thư mục `.next` cho Node.js 20.x.

```yaml
Logs: Actions → CI Pipeline → [chọn run]
```

### **Deploy Workflow**

- Kích hoạt thủ công qua nút **Run workflow** trên giao diện GitHub Actions.
- Tùy chọn môi trường deploy (Production hoặc Preview).

---

## 📊 Monitoring

### Xem CI/CD Status:
1. Vào **GitHub Repository → Actions**
2. Xem workflow runs
3. Click vào run để xem logs

### Branch Protection:
Để bắt buộc CI/CD pass trước merge:
1. **Settings → Branch protection rules**
2. Chọn branch (main/master)
3. Bật **Require status checks to pass**
4. Chọn workflow: `CI Pipeline`

---

## 💡 Tips & Best Practices

### 1. **Develop Workflow**
```bash
# Local development
npm run dev

# Trước commit
npm run lint
npm run build

# Git
git add .
git commit -m "feat: description"
git push
```

### 2. **Scripts bổ sung** (thêm vào package.json)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "ci": "npm run lint && npm run type-check && npm run build"
  }
}
```

### 3. **Cấu hình Deploy**

**Vercel:**
- Auto-linked với GitHub
- Zero-config deployment
- Automatic preview URLs

**Alternative Options:**
- Netlify
- Firebase Hosting
- AWS Amplify
- Docker + CI/CD

---

## 🔐 Security Best Practices

1. ✅ Sử dụng GitHub Secrets cho sensitive data
2. ✅ Không commit `.env` files
3. ✅ Branch protection cho main
4. ✅ Require CI/CD pass trước merge
5. ✅ Regular dependency updates

### `.env` Example:
```
# .env.local (không commit)
NEXT_PUBLIC_API_URL=http://localhost:3000
API_SECRET=your_secret_here
```

### `.gitignore` update:
```
.env
.env.local
.env.*.local
.next
node_modules
```

---

## 🚨 Troubleshooting

### Build fails locally nhưng pass CI?
```bash
# Clear cache
rm -rf .next node_modules
npm ci
npm run build
```

### Node version incompatibility?
Cập nhật `node-version` trong workflows

### Vercel deployment fails?
- Check `VERCEL_TOKEN` secrets
- Xem logs trong Vercel dashboard
- Verify `vercel.json` config

---

## 📚 Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Next.js CI/CD Guide](https://nextjs.org/docs/guides/ci-cd)
- [Vercel Deployment](https://vercel.com/docs/deployments)
- [ESLint Configuration](https://eslint.org/docs/rules/)
