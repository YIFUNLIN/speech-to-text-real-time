FROM node:18-alpine

WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝依賴
RUN npm install

# 複製原始碼
COPY . .

# 暴露端口
EXPOSE 3000

# 啟動命令
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
