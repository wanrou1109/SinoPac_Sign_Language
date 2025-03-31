#!/bin/bash
# 確保在專案根目錄
cd "$(dirname "$0")"

echo "目前路徑: $(pwd)"

# 創建 .gitignore
echo "創建 .gitignore 文件..."
cat > .gitignore << 'GITIGNORE'
node_modules/
/build
/dist
.env*
.DS_Store
.idea/
.vscode/
*.swp
*.swo
npm-debug.log*
yarn-debug.log*
yarn-error.log*
GITIGNORE

# 確認 Git 倉庫狀態
if [ ! -d .git ]; then
  echo "初始化 Git 倉庫..."
  git init
else
  echo "Git 倉庫已存在"
fi

# 設置遠程倉庫
echo "設置遠程倉庫..."
if ! git remote | grep -q "origin"; then
  git remote add origin https://github.com/wanrou1109/SinoPac_Sign_Language.git
else
  echo "更新遠程倉庫 URL..."
  git remote set-url origin https://github.com/wanrou1109/SinoPac_Sign_Language.git
fi

# 檢查遠程倉庫連接
echo "檢查遠程倉庫連接..."
git remote -v

# 獲取遠程倉庫內容
echo "獲取遠程倉庫內容..."
git fetch origin || echo "無法獲取遠程倉庫，但繼續執行..."

# 創建並切換到分支
echo "切換到分支 gue..."
git checkout -b gue 2>/dev/null || git checkout gue || echo "無法切換到分支 gue，但繼續執行..."

# 添加所有文件
echo "添加所有文件..."
git add .

# 提交更改
echo "提交更改..."
git commit -m "推送整個專案到 gue 分支" || echo "沒有新的更改需要提交"

# 推送到遠程分支
echo "推送到遠程分支..."
git push -u origin gue

echo "操作完成！"
