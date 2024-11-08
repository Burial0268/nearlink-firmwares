const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const firmwareDir = path.join(__dirname, 'firmwares');
const outputDir = path.join(__dirname, 'datas');
const backupDir = path.join(outputDir, 'backups');

// 创建输出目录
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

// 获取当前仓库信息
const repoInfo = execSync('git remote get-url origin').toString().trim().replace(/\.git$/, '').split('/');
const repoUser = repoInfo[repoInfo.length - 2];
const repoName = repoInfo[repoInfo.length - 1];
const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

// 初始化结果对象
const result = {};

// 遍历 firmware 目录
fs.readdirSync(firmwareDir).forEach(folder => {
  const folderPath = path.join(firmwareDir, folder);
  const metadataPath = path.join(folderPath, 'metadata.json');

  // 检查 metadata.json 是否存在
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    metadata.files.forEach(file => {
      file.rawLink = `https://raw.githubusercontent.com/${repoUser}/${repoName}/refs/heads/${currentBranch}/${folder}/${file.filename}`;
      delete file.filename; // 删除 filename 属性
    });
    result[folder] = metadata;
  }
});

// 生成时间戳
const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, '');
const mainFile = path.join(outputDir, 'metadata-collection-latest.json');
const backupFile = path.join(backupDir, `${timestamp}.json`);

// 写入 JSON 文件
fs.writeFileSync(mainFile, JSON.stringify(result, null, 2));
fs.writeFileSync(backupFile, JSON.stringify(result, null, 2));
