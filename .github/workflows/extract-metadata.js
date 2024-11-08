const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// 使用相对于工作目录的路径
const rootDir = process.cwd();
const firmwareDir = path.join(rootDir, 'firmwares');
const outputDir = path.join(rootDir, 'datas');
const backupDir = path.join(outputDir, 'backups');

async function main() {
  try {
    // 创建输出目录
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(backupDir, { recursive: true });

    // 获取仓库信息，使用环境变量
    const repoUser = process.env.GITHUB_REPOSITORY_OWNER;
    const repoName = process.env.GITHUB_REPOSITORY.split('/')[1];
    const currentBranch = process.env.GITHUB_REF_NAME;

    // 初始化结果对象
    const result = {};

    // 检查 firmware 目录是否存在
    try {
      await fs.access(firmwareDir);
    } catch (error) {
      console.error('Firmware directory not found:', error);
      process.exit(1);
    }

    // 遍历 firmware 目录
    const folders = await fs.readdir(firmwareDir);
    for (const folder of folders) {
      const folderPath = path.join(firmwareDir, folder);
      const metadataPath = path.join(folderPath, 'metadata.json');

      try {
        const stats = await fs.stat(folderPath);
        if (!stats.isDirectory()) continue;

        if (await fs.access(metadataPath).then(() => true).catch(() => false)) {
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          try {
            const metadata = JSON.parse(metadataContent);
            if (metadata.files && Array.isArray(metadata.files)) {
              metadata.files = metadata.files.map(file => ({
                ...file,
                rawLink: `https://raw.githubusercontent.com/${repoUser}/${repoName}/${currentBranch}/${folder}/${file.filename}`
              }));
              delete metadata.files.filename;
              result[folder] = metadata;
            }
          } catch (error) {
            console.error(`Invalid JSON in ${metadataPath}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error processing ${folder}:`, error);
      }
    }

    // 生成时间戳
    const timestamp = new Date().toISOString().replace(/[-T:\.Z]/g, '');
    const mainFile = path.join(outputDir, 'metadata-collection-latest.json');
    const backupFile = path.join(backupDir, `${timestamp}.json`);

    // 写入 JSON 文件
    await fs.writeFile(mainFile, JSON.stringify(result, null, 2));
    await fs.writeFile(backupFile, JSON.stringify(result, null, 2));

    console.log('Metadata processing completed successfully');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
