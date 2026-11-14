import { huoQuFanYi } from './translations'

export const CuoWuDaiMa = {
  REQUEST_PARAMETER_INVALID: 'REQUEST_PARAMETER_INVALID',
  REQUEST_MISSING_PARAMETER: 'REQUEST_MISSING_PARAMETER',
  REQUEST_BODY_INVALID: 'REQUEST_BODY_INVALID',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_EXPIRED: 'RESOURCE_EXPIRED',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UPSTREAM_NETWORK_ERROR: 'UPSTREAM_NETWORK_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
  DATABASE_ERROR: 'DATABASE_ERROR',
  ORIGIN_DENIED: 'ORIGIN_DENIED',
  AUTH_SMS_RATE_LIMITED: 'AUTH_SMS_RATE_LIMITED',
  AUTH_SMS_SEND_FAILED: 'AUTH_SMS_SEND_FAILED',
  AUTH_HUMAN_VERIFICATION_FAILED: 'AUTH_HUMAN_VERIFICATION_FAILED',
  AUTH_REGISTRATION_CLOSED: 'AUTH_REGISTRATION_CLOSED',
  AUTH_ACCOUNT_ALREADY_EXISTS: 'AUTH_ACCOUNT_ALREADY_EXISTS',
  AUTH_USERNAME_TAKEN: 'AUTH_USERNAME_TAKEN',
  AUTH_USERNAME_INVALID: 'AUTH_USERNAME_INVALID',
  AUTH_VERIFICATION_CODE_INVALID: 'AUTH_VERIFICATION_CODE_INVALID',
  AUTH_VERIFICATION_CODE_EXPIRED: 'AUTH_VERIFICATION_CODE_EXPIRED',
  AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED: 'AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED',
  AUTH_PHONE_NOT_ACCEPTED: 'AUTH_PHONE_NOT_ACCEPTED',
  AUTH_PASSWORD_WEAK: 'AUTH_PASSWORD_WEAK',
  AUTH_BIRTH_DATE_INVALID: 'AUTH_BIRTH_DATE_INVALID',
  AUTH_AGREEMENT_REQUIRED: 'AUTH_AGREEMENT_REQUIRED',
  AUTH_REGISTRATION_FAILED: 'AUTH_REGISTRATION_FAILED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_REFRESH_TOKEN_INVALID: 'AUTH_REFRESH_TOKEN_INVALID',
  AUTH_PASSWORD_CHANGE_FAILED: 'AUTH_PASSWORD_CHANGE_FAILED',
  AUTH_PASSWORD_RESET_FAILED: 'AUTH_PASSWORD_RESET_FAILED',
  AUTH_USERNAME_CHANGE_FAILED: 'AUTH_USERNAME_CHANGE_FAILED',
  AUTH_DEFAULT_GENDER_INVALID: 'AUTH_DEFAULT_GENDER_INVALID',
  AUTH_ACCOUNT_DELETION_FAILED: 'AUTH_ACCOUNT_DELETION_FAILED',
  ROLE_GENERATION_INPUT_INVALID: 'ROLE_GENERATION_INPUT_INVALID',
  ROLE_GENERATION_PERSONA_REJECTED: 'ROLE_GENERATION_PERSONA_REJECTED',
  ROLE_GENERATION_INITIALIZATION_FAILED: 'ROLE_GENERATION_INITIALIZATION_FAILED',
  ROLE_GENERATION_MODEL_UNAVAILABLE: 'ROLE_GENERATION_MODEL_UNAVAILABLE',
  ROLE_GENERATION_MODEL_CALL_FAILED: 'ROLE_GENERATION_MODEL_CALL_FAILED',
  ROLE_GENERATION_RESPONSE_INVALID: 'ROLE_GENERATION_RESPONSE_INVALID',
  ROLE_GENERATION_PERSISTENCE_FAILED: 'ROLE_GENERATION_PERSISTENCE_FAILED',
  DEPENDENCY_POSTGRES_UNAVAILABLE: 'DEPENDENCY_POSTGRES_UNAVAILABLE',
  DEPENDENCY_REDIS_UNAVAILABLE: 'DEPENDENCY_REDIS_UNAVAILABLE',
  DEPENDENCIES_UNAVAILABLE: 'DEPENDENCIES_UNAVAILABLE',
  DOCKER_STARTUP_MIGRATION_SCRIPT_MISSING: 'DOCKER_STARTUP_MIGRATION_SCRIPT_MISSING',
  DOCKER_STARTUP_MIGRATION_FAILED: 'DOCKER_STARTUP_MIGRATION_FAILED',
  DOCKER_STARTUP_REDIS_TLS_INVALID: 'DOCKER_STARTUP_REDIS_TLS_INVALID',
  DOCKER_STARTUP_REDIS_UNAVAILABLE: 'DOCKER_STARTUP_REDIS_UNAVAILABLE',
  DOCKER_STARTUP_POSTGRES_UNAVAILABLE: 'DOCKER_STARTUP_POSTGRES_UNAVAILABLE',
  DOCKER_STARTUP_MODERATION_RESOURCE_UNAVAILABLE: 'DOCKER_STARTUP_MODERATION_RESOURCE_UNAVAILABLE',
  ZHAN_JI_FEN_LEI_MING_CHENG_WU_XIAO: 'ZHAN_JI_FEN_LEI_MING_CHENG_WU_XIAO',
  ZHAN_JI_FEN_LEI_MING_CHENG_CHANG: 'ZHAN_JI_FEN_LEI_MING_CHENG_CHANG',
  ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU: 'ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU',
  ZHAN_JI_FEN_LEI_BIAN_GENG: 'ZHAN_JI_FEN_LEI_BIAN_GENG',
  ZHAN_JI_MO_REN_FEN_LEI_BU_NENG_SHAN_CHU: 'ZHAN_JI_MO_REN_FEN_LEI_BU_NENG_SHAN_CHU',
  ZHAN_JI_FEN_LEI_BU_CUN_ZAI: 'ZHAN_JI_FEN_LEI_BU_CUN_ZAI',
  ZHAN_JI_DANG_AN_BU_CUN_ZAI: 'ZHAN_JI_DANG_AN_BU_CUN_ZAI',
  ZHAN_JI_DANG_AN_BU_SHU_YU_FEN_LEI: 'ZHAN_JI_DANG_AN_BU_SHU_YU_FEN_LEI',
  ZHAN_JI_BU_NENG_YIDONG_DAO_DANG_QIAN_FEN_LEI: 'ZHAN_JI_BU_NENG_YIDONG_DAO_DANG_QIAN_FEN_LEI',
  ZHAN_JI_PAI_XU_ID_CHONG_FU: 'ZHAN_JI_PAI_XU_ID_CHONG_FU',
  ZHAN_JI_PAI_XU_JI_LU_BU_WU_ZHEN: 'ZHAN_JI_PAI_XU_JI_LU_BU_WU_ZHEN',
  ZHAN_JI_SHU_JU_BIAN_HUA: 'ZHAN_JI_SHU_JU_BIAN_HUA',
  ZHAN_JI_FEN_LEI_BAN_BEN_BU_HE_FA: 'ZHAN_JI_FEN_LEI_BAN_BEN_BU_HE_FA',
  ZHAN_JI_PAI_XU_CAN_SHU_BU_HE_FA: 'ZHAN_JI_PAI_XU_CAN_SHU_BU_HE_FA',
} as const

export const JiuDaiMa = {
  WEI_SHOU_QUAN: 'WEI_SHOU_QUAN',
  WU_GUAN_LI_QUAN_XIAN: 'WU_GUAN_LI_QUAN_XIAN',
} as const

export type CuoWuDaiMa = typeof CuoWuDaiMa[keyof typeof CuoWuDaiMa]
export type CuoWuJieMian = string
export type ZhanJiFenLeiCuoWuDaiMa = Extract<CuoWuDaiMa, `ZHAN_JI_${string}`>
export type JiaoSeShengChengCuoWuDaiMa = Extract<CuoWuDaiMa, `ROLE_GENERATION_${string}`>

export interface CuoWuXianRong {
  code: CuoWuDaiMa
  jieMian: CuoWuJieMian
  httpStatus: number
  message: string
  retryable: boolean
  retryAfterMs?: number
}

const xianRongBiao: Record<CuoWuDaiMa, Omit<CuoWuXianRong, 'message'>> = {
  [CuoWuDaiMa.REQUEST_PARAMETER_INVALID]: { code: CuoWuDaiMa.REQUEST_PARAMETER_INVALID, jieMian: 'tongYong', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.REQUEST_MISSING_PARAMETER]: { code: CuoWuDaiMa.REQUEST_MISSING_PARAMETER, jieMian: 'tongYong', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.REQUEST_BODY_INVALID]: { code: CuoWuDaiMa.REQUEST_BODY_INVALID, jieMian: 'tongYong', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.PAYLOAD_TOO_LARGE]: { code: CuoWuDaiMa.PAYLOAD_TOO_LARGE, jieMian: 'tongYong', httpStatus: 413, retryable: false },
  [CuoWuDaiMa.AUTHENTICATION_REQUIRED]: { code: CuoWuDaiMa.AUTHENTICATION_REQUIRED, jieMian: 'tongYong', httpStatus: 401, retryable: false },
  [CuoWuDaiMa.AUTH_TOKEN_INVALID]: { code: CuoWuDaiMa.AUTH_TOKEN_INVALID, jieMian: 'renZheng', httpStatus: 401, retryable: false },
  [CuoWuDaiMa.PERMISSION_DENIED]: { code: CuoWuDaiMa.PERMISSION_DENIED, jieMian: 'guanLiYuan', httpStatus: 403, retryable: false },
  [CuoWuDaiMa.RESOURCE_NOT_FOUND]: { code: CuoWuDaiMa.RESOURCE_NOT_FOUND, jieMian: 'tongYong', httpStatus: 404, retryable: false },
  [CuoWuDaiMa.RESOURCE_EXPIRED]: { code: CuoWuDaiMa.RESOURCE_EXPIRED, jieMian: 'liaoTian', httpStatus: 410, retryable: false },
  [CuoWuDaiMa.METHOD_NOT_ALLOWED]: { code: CuoWuDaiMa.METHOD_NOT_ALLOWED, jieMian: 'tongYong', httpStatus: 405, retryable: false },
  [CuoWuDaiMa.RESOURCE_CONFLICT]: { code: CuoWuDaiMa.RESOURCE_CONFLICT, jieMian: 'tongYong', httpStatus: 409, retryable: false },
  [CuoWuDaiMa.RATE_LIMITED]: { code: CuoWuDaiMa.RATE_LIMITED, jieMian: 'tongYong', httpStatus: 429, retryable: true, retryAfterMs: 1000 },
  [CuoWuDaiMa.INTERNAL_ERROR]: { code: CuoWuDaiMa.INTERNAL_ERROR, jieMian: 'tongYong', httpStatus: 500, retryable: false },
  [CuoWuDaiMa.UPSTREAM_NETWORK_ERROR]: { code: CuoWuDaiMa.UPSTREAM_NETWORK_ERROR, jieMian: 'tongYong', httpStatus: 502, retryable: true },
  [CuoWuDaiMa.SERVICE_UNAVAILABLE]: { code: CuoWuDaiMa.SERVICE_UNAVAILABLE, jieMian: 'tongYong', httpStatus: 503, retryable: true },
  [CuoWuDaiMa.UPSTREAM_TIMEOUT]: { code: CuoWuDaiMa.UPSTREAM_TIMEOUT, jieMian: 'tongYong', httpStatus: 504, retryable: true },
  [CuoWuDaiMa.DATABASE_ERROR]: { code: CuoWuDaiMa.DATABASE_ERROR, jieMian: 'tongYong', httpStatus: 503, retryable: true },
  [CuoWuDaiMa.ORIGIN_DENIED]: { code: CuoWuDaiMa.ORIGIN_DENIED, jieMian: 'tongYong', httpStatus: 403, retryable: false },
  [CuoWuDaiMa.AUTH_SMS_RATE_LIMITED]: { code: CuoWuDaiMa.AUTH_SMS_RATE_LIMITED, jieMian: 'renZheng', httpStatus: 429, retryable: true, retryAfterMs: 60000 },
  [CuoWuDaiMa.AUTH_SMS_SEND_FAILED]: { code: CuoWuDaiMa.AUTH_SMS_SEND_FAILED, jieMian: 'renZheng', httpStatus: 503, retryable: true },
  [CuoWuDaiMa.AUTH_HUMAN_VERIFICATION_FAILED]: { code: CuoWuDaiMa.AUTH_HUMAN_VERIFICATION_FAILED, jieMian: 'renZheng', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.AUTH_REGISTRATION_CLOSED]: { code: CuoWuDaiMa.AUTH_REGISTRATION_CLOSED, jieMian: 'renZheng', httpStatus: 429, retryable: false },
  [CuoWuDaiMa.AUTH_ACCOUNT_ALREADY_EXISTS]: { code: CuoWuDaiMa.AUTH_ACCOUNT_ALREADY_EXISTS, jieMian: 'renZheng', httpStatus: 409, retryable: false },
  [CuoWuDaiMa.AUTH_USERNAME_TAKEN]: { code: CuoWuDaiMa.AUTH_USERNAME_TAKEN, jieMian: 'renZheng', httpStatus: 409, retryable: false },
  [CuoWuDaiMa.AUTH_USERNAME_INVALID]: { code: CuoWuDaiMa.AUTH_USERNAME_INVALID, jieMian: 'renZheng', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.AUTH_VERIFICATION_CODE_INVALID]: { code: CuoWuDaiMa.AUTH_VERIFICATION_CODE_INVALID, jieMian: 'renZheng', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.AUTH_VERIFICATION_CODE_EXPIRED]: { code: CuoWuDaiMa.AUTH_VERIFICATION_CODE_EXPIRED, jieMian: 'renZheng', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED]: { code: CuoWuDaiMa.AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED, jieMian: 'renZheng', httpStatus: 429, retryable: false },
  [CuoWuDaiMa.AUTH_PHONE_NOT_ACCEPTED]: { code: CuoWuDaiMa.AUTH_PHONE_NOT_ACCEPTED, jieMian: 'renZheng', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.AUTH_PASSWORD_WEAK]: { code: CuoWuDaiMa.AUTH_PASSWORD_WEAK, jieMian: 'renZheng', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.AUTH_BIRTH_DATE_INVALID]: { code: CuoWuDaiMa.AUTH_BIRTH_DATE_INVALID, jieMian: 'renZheng', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.AUTH_AGREEMENT_REQUIRED]: { code: CuoWuDaiMa.AUTH_AGREEMENT_REQUIRED, jieMian: 'renZheng', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.AUTH_REGISTRATION_FAILED]: { code: CuoWuDaiMa.AUTH_REGISTRATION_FAILED, jieMian: 'renZheng', httpStatus: 503, retryable: true },
  [CuoWuDaiMa.AUTH_INVALID_CREDENTIALS]: { code: CuoWuDaiMa.AUTH_INVALID_CREDENTIALS, jieMian: 'renZheng', httpStatus: 401, retryable: false },
  [CuoWuDaiMa.AUTH_REFRESH_TOKEN_INVALID]: { code: CuoWuDaiMa.AUTH_REFRESH_TOKEN_INVALID, jieMian: 'renZheng', httpStatus: 401, retryable: false },
  [CuoWuDaiMa.AUTH_PASSWORD_CHANGE_FAILED]: { code: CuoWuDaiMa.AUTH_PASSWORD_CHANGE_FAILED, jieMian: 'renZheng', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.AUTH_PASSWORD_RESET_FAILED]: { code: CuoWuDaiMa.AUTH_PASSWORD_RESET_FAILED, jieMian: 'renZheng', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.AUTH_USERNAME_CHANGE_FAILED]: { code: CuoWuDaiMa.AUTH_USERNAME_CHANGE_FAILED, jieMian: 'renZheng', httpStatus: 409, retryable: false },
  [CuoWuDaiMa.AUTH_DEFAULT_GENDER_INVALID]: { code: CuoWuDaiMa.AUTH_DEFAULT_GENDER_INVALID, jieMian: 'anQuan', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.AUTH_ACCOUNT_DELETION_FAILED]: { code: CuoWuDaiMa.AUTH_ACCOUNT_DELETION_FAILED, jieMian: 'renZheng', httpStatus: 500, retryable: false },
  [CuoWuDaiMa.ROLE_GENERATION_INPUT_INVALID]: { code: CuoWuDaiMa.ROLE_GENERATION_INPUT_INVALID, jieMian: 'jiaoSe', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.ROLE_GENERATION_PERSONA_REJECTED]: { code: CuoWuDaiMa.ROLE_GENERATION_PERSONA_REJECTED, jieMian: 'jiaoSe', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.ROLE_GENERATION_INITIALIZATION_FAILED]: { code: CuoWuDaiMa.ROLE_GENERATION_INITIALIZATION_FAILED, jieMian: 'jiaoSe', httpStatus: 500, retryable: false },
  [CuoWuDaiMa.ROLE_GENERATION_MODEL_UNAVAILABLE]: { code: CuoWuDaiMa.ROLE_GENERATION_MODEL_UNAVAILABLE, jieMian: 'jiaoSe', httpStatus: 503, retryable: true },
  [CuoWuDaiMa.ROLE_GENERATION_MODEL_CALL_FAILED]: { code: CuoWuDaiMa.ROLE_GENERATION_MODEL_CALL_FAILED, jieMian: 'jiaoSe', httpStatus: 502, retryable: true },
  [CuoWuDaiMa.ROLE_GENERATION_RESPONSE_INVALID]: { code: CuoWuDaiMa.ROLE_GENERATION_RESPONSE_INVALID, jieMian: 'jiaoSe', httpStatus: 502, retryable: true },
  [CuoWuDaiMa.ROLE_GENERATION_PERSISTENCE_FAILED]: { code: CuoWuDaiMa.ROLE_GENERATION_PERSISTENCE_FAILED, jieMian: 'jiaoSe', httpStatus: 503, retryable: true },
  [CuoWuDaiMa.DEPENDENCY_POSTGRES_UNAVAILABLE]: { code: CuoWuDaiMa.DEPENDENCY_POSTGRES_UNAVAILABLE, jieMian: 'tongYong', httpStatus: 503, retryable: true },
  [CuoWuDaiMa.DEPENDENCY_REDIS_UNAVAILABLE]: { code: CuoWuDaiMa.DEPENDENCY_REDIS_UNAVAILABLE, jieMian: 'tongYong', httpStatus: 503, retryable: true },
  [CuoWuDaiMa.DEPENDENCIES_UNAVAILABLE]: { code: CuoWuDaiMa.DEPENDENCIES_UNAVAILABLE, jieMian: 'tongYong', httpStatus: 503, retryable: true },
  [CuoWuDaiMa.DOCKER_STARTUP_MIGRATION_SCRIPT_MISSING]: { code: CuoWuDaiMa.DOCKER_STARTUP_MIGRATION_SCRIPT_MISSING, jieMian: 'qiDong', httpStatus: 503, retryable: false },
  [CuoWuDaiMa.DOCKER_STARTUP_MIGRATION_FAILED]: { code: CuoWuDaiMa.DOCKER_STARTUP_MIGRATION_FAILED, jieMian: 'qiDong', httpStatus: 503, retryable: true },
  [CuoWuDaiMa.DOCKER_STARTUP_REDIS_TLS_INVALID]: { code: CuoWuDaiMa.DOCKER_STARTUP_REDIS_TLS_INVALID, jieMian: 'qiDong', httpStatus: 503, retryable: false },
  [CuoWuDaiMa.DOCKER_STARTUP_REDIS_UNAVAILABLE]: { code: CuoWuDaiMa.DOCKER_STARTUP_REDIS_UNAVAILABLE, jieMian: 'qiDong', httpStatus: 503, retryable: true },
  [CuoWuDaiMa.DOCKER_STARTUP_POSTGRES_UNAVAILABLE]: { code: CuoWuDaiMa.DOCKER_STARTUP_POSTGRES_UNAVAILABLE, jieMian: 'qiDong', httpStatus: 503, retryable: true },
  [CuoWuDaiMa.DOCKER_STARTUP_MODERATION_RESOURCE_UNAVAILABLE]: { code: CuoWuDaiMa.DOCKER_STARTUP_MODERATION_RESOURCE_UNAVAILABLE, jieMian: 'qiDong', httpStatus: 503, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_FEN_LEI_MING_CHENG_WU_XIAO]: { code: CuoWuDaiMa.ZHAN_JI_FEN_LEI_MING_CHENG_WU_XIAO, jieMian: 'zhanJi', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_FEN_LEI_MING_CHENG_CHANG]: { code: CuoWuDaiMa.ZHAN_JI_FEN_LEI_MING_CHENG_CHANG, jieMian: 'zhanJi', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU]: { code: CuoWuDaiMa.ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU, jieMian: 'zhanJi', httpStatus: 409, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_FEN_LEI_BIAN_GENG]: { code: CuoWuDaiMa.ZHAN_JI_FEN_LEI_BIAN_GENG, jieMian: 'zhanJi', httpStatus: 409, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_MO_REN_FEN_LEI_BU_NENG_SHAN_CHU]: { code: CuoWuDaiMa.ZHAN_JI_MO_REN_FEN_LEI_BU_NENG_SHAN_CHU, jieMian: 'zhanJi', httpStatus: 409, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_FEN_LEI_BU_CUN_ZAI]: { code: CuoWuDaiMa.ZHAN_JI_FEN_LEI_BU_CUN_ZAI, jieMian: 'zhanJi', httpStatus: 404, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_DANG_AN_BU_CUN_ZAI]: { code: CuoWuDaiMa.ZHAN_JI_DANG_AN_BU_CUN_ZAI, jieMian: 'zhanJi', httpStatus: 404, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_DANG_AN_BU_SHU_YU_FEN_LEI]: { code: CuoWuDaiMa.ZHAN_JI_DANG_AN_BU_SHU_YU_FEN_LEI, jieMian: 'zhanJi', httpStatus: 409, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_BU_NENG_YIDONG_DAO_DANG_QIAN_FEN_LEI]: { code: CuoWuDaiMa.ZHAN_JI_BU_NENG_YIDONG_DAO_DANG_QIAN_FEN_LEI, jieMian: 'zhanJi', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_PAI_XU_ID_CHONG_FU]: { code: CuoWuDaiMa.ZHAN_JI_PAI_XU_ID_CHONG_FU, jieMian: 'zhanJi', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_PAI_XU_JI_LU_BU_WU_ZHEN]: { code: CuoWuDaiMa.ZHAN_JI_PAI_XU_JI_LU_BU_WU_ZHEN, jieMian: 'zhanJi', httpStatus: 409, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_SHU_JU_BIAN_HUA]: { code: CuoWuDaiMa.ZHAN_JI_SHU_JU_BIAN_HUA, jieMian: 'zhanJi', httpStatus: 409, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_FEN_LEI_BAN_BEN_BU_HE_FA]: { code: CuoWuDaiMa.ZHAN_JI_FEN_LEI_BAN_BEN_BU_HE_FA, jieMian: 'zhanJi', httpStatus: 400, retryable: false },
  [CuoWuDaiMa.ZHAN_JI_PAI_XU_CAN_SHU_BU_HE_FA]: { code: CuoWuDaiMa.ZHAN_JI_PAI_XU_CAN_SHU_BU_HE_FA, jieMian: 'zhanJi', httpStatus: 400, retryable: false },
}

const fanYiJianBiao: Record<CuoWuDaiMa, string> = {
  [CuoWuDaiMa.REQUEST_PARAMETER_INVALID]: 'canShuBuHeFa',
  [CuoWuDaiMa.REQUEST_MISSING_PARAMETER]: 'queShaoCanShu',
  [CuoWuDaiMa.REQUEST_BODY_INVALID]: 'canShuBuHeFa',
  [CuoWuDaiMa.PAYLOAD_TOO_LARGE]: 'qingQiuNeiRongGuoDa',
  [CuoWuDaiMa.AUTHENTICATION_REQUIRED]: 'weiShouQuan',
  [CuoWuDaiMa.AUTH_TOKEN_INVALID]: 'lingPaiWuXiao',
  [CuoWuDaiMa.PERMISSION_DENIED]: 'wuGuanLiQuanXian',
  [CuoWuDaiMa.RESOURCE_NOT_FOUND]: 'ziYuanBuCunZai',
  [CuoWuDaiMa.RESOURCE_EXPIRED]: 'meiTiYiShiXiao',
  [CuoWuDaiMa.METHOD_NOT_ALLOWED]: 'fangFaBuYunXu',
  [CuoWuDaiMa.RESOURCE_CONFLICT]: 'ziYuanChongTu',
  [CuoWuDaiMa.RATE_LIMITED]: 'caoZuoPinFan',
  [CuoWuDaiMa.INTERNAL_ERROR]: 'fuWuQiNeiBuCuoWu',
  [CuoWuDaiMa.UPSTREAM_NETWORK_ERROR]: 'waiBuFuWuWuXianZhi',
  [CuoWuDaiMa.SERVICE_UNAVAILABLE]: 'fuWuQiWeiBeiHouXu',
  [CuoWuDaiMa.UPSTREAM_TIMEOUT]: 'fuFuWuWaiXianZhi',
  [CuoWuDaiMa.DATABASE_ERROR]: 'shuJuKuWeiBeiHouXu',
  [CuoWuDaiMa.ORIGIN_DENIED]: 'yuanLaiWeiBeiJieShou',
  [CuoWuDaiMa.AUTH_SMS_RATE_LIMITED]: 'faSongYanZhengMaPinFan',
  [CuoWuDaiMa.AUTH_SMS_SEND_FAILED]: 'faSongYanZhengMaFuWuWuXianZhi',
  [CuoWuDaiMa.AUTH_HUMAN_VERIFICATION_FAILED]: 'renJiYanZhengWeiTongGuo',
  [CuoWuDaiMa.AUTH_REGISTRATION_CLOSED]: 'tiYanBanManYuan',
  [CuoWuDaiMa.AUTH_ACCOUNT_ALREADY_EXISTS]: 'shouJiHaoYiZhuCe',
  [CuoWuDaiMa.AUTH_USERNAME_TAKEN]: 'yongHuMingYiCunZai',
  [CuoWuDaiMa.AUTH_USERNAME_INVALID]: 'yongHuMingTeShuZiFu',
  [CuoWuDaiMa.AUTH_VERIFICATION_CODE_INVALID]: 'yanZhengMaCuoWu',
  [CuoWuDaiMa.AUTH_VERIFICATION_CODE_EXPIRED]: 'yanZhengMaGuoQi',
  [CuoWuDaiMa.AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED]: 'yanZhengMaChangShiGuoDuo',
  [CuoWuDaiMa.AUTH_PHONE_NOT_ACCEPTED]: 'shouJiHaoDiQuBuFu',
  [CuoWuDaiMa.AUTH_PASSWORD_WEAK]: 'miMaFuZaDuBuZu',
  [CuoWuDaiMa.AUTH_BIRTH_DATE_INVALID]: 'chuShengRiQiGeShiCuoWu',
  [CuoWuDaiMa.AUTH_AGREEMENT_REQUIRED]: 'weiTongYiXieYi',
  [CuoWuDaiMa.AUTH_REGISTRATION_FAILED]: 'zhuCeFuWuWuXianZhi',
  [CuoWuDaiMa.AUTH_INVALID_CREDENTIALS]: 'zhangHaoHuoMiMaCuoWu',
  [CuoWuDaiMa.AUTH_REFRESH_TOKEN_INVALID]: 'lingPaiWuXiao',
  [CuoWuDaiMa.AUTH_PASSWORD_CHANGE_FAILED]: 'xiuGaiMiMaShiBai',
  [CuoWuDaiMa.AUTH_PASSWORD_RESET_FAILED]: 'chongZhiMiMaTongYiTiShi',
  [CuoWuDaiMa.AUTH_USERNAME_CHANGE_FAILED]: 'xiuGaiYongHuMingShiBai',
  [CuoWuDaiMa.AUTH_DEFAULT_GENDER_INVALID]: 'shenFenBuHeFa',
  [CuoWuDaiMa.AUTH_ACCOUNT_DELETION_FAILED]: 'zhuXiaoShiBai',
  [CuoWuDaiMa.ROLE_GENERATION_INPUT_INVALID]: 'shengChengCanShuBuHeFa',
  [CuoWuDaiMa.ROLE_GENERATION_PERSONA_REJECTED]: 'renSheJuJue',
  [CuoWuDaiMa.ROLE_GENERATION_INITIALIZATION_FAILED]: 'shengChengChuShiShiBai',
  [CuoWuDaiMa.ROLE_GENERATION_MODEL_UNAVAILABLE]: 'shengChengMoXingFuWuWuXianZhi',
  [CuoWuDaiMa.ROLE_GENERATION_MODEL_CALL_FAILED]: 'shengChengMoXingFuWuWuXianZhi',
  [CuoWuDaiMa.ROLE_GENERATION_RESPONSE_INVALID]: 'shengChengMoXingHuiFuBuHeFa',
  [CuoWuDaiMa.ROLE_GENERATION_PERSISTENCE_FAILED]: 'baoCunJiaoSeShiBai',
  [CuoWuDaiMa.DEPENDENCY_POSTGRES_UNAVAILABLE]: 'shuJuKuWeiBeiHouXu',
  [CuoWuDaiMa.DEPENDENCY_REDIS_UNAVAILABLE]: 'huanCunWeiBeiHouXu',
  [CuoWuDaiMa.DEPENDENCIES_UNAVAILABLE]: 'yiZhiXingFuWuWuXianZhi',
  [CuoWuDaiMa.DOCKER_STARTUP_MIGRATION_SCRIPT_MISSING]: 'jiaoBenBuWanZheng',
  [CuoWuDaiMa.DOCKER_STARTUP_MIGRATION_FAILED]: 'yiJuWeiFaWanCheng',
  [CuoWuDaiMa.DOCKER_STARTUP_REDIS_TLS_INVALID]: 'huanCunJiaYuBuAnQuan',
  [CuoWuDaiMa.DOCKER_STARTUP_REDIS_UNAVAILABLE]: 'qiDongHuanCunYiBuKeYong',
  [CuoWuDaiMa.DOCKER_STARTUP_POSTGRES_UNAVAILABLE]: 'qiDongShuJuKuYiBuKeYong',
  [CuoWuDaiMa.DOCKER_STARTUP_MODERATION_RESOURCE_UNAVAILABLE]: 'shenHeZiDuanKuBuKeYong',
  [CuoWuDaiMa.ZHAN_JI_FEN_LEI_MING_CHENG_WU_XIAO]: 'fenLeiMingChengBuNengWeiKong',
  [CuoWuDaiMa.ZHAN_JI_FEN_LEI_MING_CHENG_CHANG]: 'fenLeiMingChengTaiChang',
  [CuoWuDaiMa.ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU]: 'fenLeiMingChengYiCunZai',
  [CuoWuDaiMa.ZHAN_JI_FEN_LEI_BIAN_GENG]: 'fenLeiShuJuYiBianHua',
  [CuoWuDaiMa.ZHAN_JI_MO_REN_FEN_LEI_BU_NENG_SHAN_CHU]: 'moRenFenLeiBuNengShanChu',
  [CuoWuDaiMa.ZHAN_JI_FEN_LEI_BU_CUN_ZAI]: 'fenLeiBuCunZai',
  [CuoWuDaiMa.ZHAN_JI_DANG_AN_BU_CUN_ZAI]: 'dangAnBuCunZai',
  [CuoWuDaiMa.ZHAN_JI_DANG_AN_BU_SHU_YU_FEN_LEI]: 'dangAnBuShuYuFenLei',
  [CuoWuDaiMa.ZHAN_JI_BU_NENG_YIDONG_DAO_DANG_QIAN_FEN_LEI]: 'buNengYiDongDaoDangQianFenLei',
  [CuoWuDaiMa.ZHAN_JI_PAI_XU_ID_CHONG_FU]: 'paiXuIDChongFu',
  [CuoWuDaiMa.ZHAN_JI_PAI_XU_JI_LU_BU_WU_ZHEN]: 'paiXuBiXuBaoHanFenLeiQuanBuKeJianZhanJi',
  [CuoWuDaiMa.ZHAN_JI_SHU_JU_BIAN_HUA]: 'fenLeiShuJuYiBianHua',
  [CuoWuDaiMa.ZHAN_JI_FEN_LEI_BAN_BEN_BU_HE_FA]: 'fenLeiShuJuYiBianHua',
  [CuoWuDaiMa.ZHAN_JI_PAI_XU_CAN_SHU_BU_HE_FA]: 'paiXuCanShuBuHeFa',
}

export const dengLiCuoWuXianRongLieBiao = Object.freeze(
  Object.keys(xianRongBiao) as CuoWuDaiMa[],
)

export function shiCuoWuDaiMa(zhi: unknown): zhi is CuoWuDaiMa {
  return typeof zhi === 'string' && Object.hasOwn(xianRongBiao, zhi)
}

export function huoQuCuoWuXianRong(daiMa: CuoWuDaiMa): CuoWuXianRong {
  const xianRong = xianRongBiao[daiMa]
  const fanYi = (huoQuFanYi as (jieMian: string, jian: string) => string)(
    xianRong.jieMian,
    fanYiJianBiao[daiMa],
  )
  return { ...xianRong, message: fanYi }
}

export class YingYongCuoWu extends Error {
  constructor(public readonly code: CuoWuDaiMa, cause?: unknown) {
    super(code)
    this.name = 'YingYongCuoWu'
    if (cause !== undefined) this.cause = cause
  }
}

export class JiaoSeShengChengCuoWu extends YingYongCuoWu {
  constructor(code: JiaoSeShengChengCuoWuDaiMa, cause?: unknown) {
    super(code, cause)
    this.name = 'JiaoSeShengChengCuoWu'
  }
}

const jiuDaiMaBianShe: Readonly<Record<string, CuoWuDaiMa>> = {
  CAN_SHU_CUO_WU: CuoWuDaiMa.REQUEST_PARAMETER_INVALID,
  WEI_SHOU_QUAN: CuoWuDaiMa.AUTHENTICATION_REQUIRED,
  LING_PAI_WU_XIAO: CuoWuDaiMa.AUTH_TOKEN_INVALID,
  WU_GUAN_LI_QUAN_XIAN: CuoWuDaiMa.PERMISSION_DENIED,
  WEI_ZHAO_DAO: CuoWuDaiMa.RESOURCE_NOT_FOUND,
}

export function zhuanHuanJiuDaiMa(zhi: unknown): CuoWuDaiMa | null {
  if (shiCuoWuDaiMa(zhi)) return zhi
  if (typeof zhi !== 'string') return null
  return jiuDaiMaBianShe[zhi] || null
}

export function daiMaHuoQuZhuangTaiMa(zhi: unknown): CuoWuDaiMa {
  if (shiCuoWuDaiMa(zhi)) return zhi
  if (zhi === 400) return CuoWuDaiMa.REQUEST_PARAMETER_INVALID
  if (zhi === 401) return CuoWuDaiMa.AUTHENTICATION_REQUIRED
  if (zhi === 403) return CuoWuDaiMa.PERMISSION_DENIED
  if (zhi === 404) return CuoWuDaiMa.RESOURCE_NOT_FOUND
  if (zhi === 410) return CuoWuDaiMa.RESOURCE_EXPIRED
  if (zhi === 405) return CuoWuDaiMa.METHOD_NOT_ALLOWED
  if (zhi === 409) return CuoWuDaiMa.RESOURCE_CONFLICT
  if (zhi === 413) return CuoWuDaiMa.PAYLOAD_TOO_LARGE
  if (zhi === 429) return CuoWuDaiMa.RATE_LIMITED
  if (zhi === 502) return CuoWuDaiMa.UPSTREAM_NETWORK_ERROR
  if (zhi === 503) return CuoWuDaiMa.SERVICE_UNAVAILABLE
  if (zhi === 504) return CuoWuDaiMa.UPSTREAM_TIMEOUT
  return CuoWuDaiMa.INTERNAL_ERROR
}
