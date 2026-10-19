import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const avatarDir = 'public/图片/军师头像'
const files = ['军师玄锐暮头像.png', '军师测试军师1头像.png', '军师测试军师2头像.png']

for (const file of files) {
  const inputPath = path.join(avatarDir, file)
  const outputPath = path.join(avatarDir, file.replace('.png', '.webp'))

  await sharp(inputPath).webp({ quality: 80 }).toFile(outputPath)

  fs.unlinkSync(inputPath)
}
