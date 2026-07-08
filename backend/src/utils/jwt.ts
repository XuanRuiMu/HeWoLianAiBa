import jwt from 'jsonwebtoken'
import { peiZhi } from '../config'

export interface LingPaiZaiHe {
  yongHuId: string
  shouJiHao: string
}

export function shengChengLingPai(zaiHe: LingPaiZaiHe): string {
  return jwt.sign(zaiHe, peiZhi.jwtMiYao as jwt.Secret, {
    expiresIn: peiZhi.jwtGuoQi,
  } as jwt.SignOptions)
}

export function yanZhengLingPai(lingPai: string): LingPaiZaiHe {
  return jwt.verify(lingPai, peiZhi.jwtMiYao as jwt.Secret) as LingPaiZaiHe
}
