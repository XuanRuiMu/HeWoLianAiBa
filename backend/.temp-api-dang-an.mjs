async function dengLu(shouJiHao, miMa) {
  const res = await fetch('http://localhost:3000/api/认证/登录', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shouJiHao, miMa }),
  })
  const data = await res.json()
  return data.shu_ju.令牌
}

async function huoQuDangAn(lingPai) {
  const res = await fetch('http://localhost:3000/api/战绩/列表', {
    headers: { Authorization: `Bearer ${lingPai}` },
  })
  return res.json()
}

async function main() {
  const lingPai = await dengLu('13800138002', 'Test123456')
  console.log('token:', lingPai.substring(0, 20) + '...')
  const shuJu = await huoQuDangAn(lingPai)
  console.log(JSON.stringify(shuJu, null, 2))
}

main().catch(console.error)
