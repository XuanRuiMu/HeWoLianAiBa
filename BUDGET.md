# 循环工程预算

<!-- 2026-09-29 恢复会话时补建（交接时缺失）。计数不因会话恢复重置。 -->

|字段|值|说明|
|---|---|---|
|total_loop_limit|50|主代理编排轮次上限（2026-09-29 由 30 调至 50，留痕见 .agents/evidence/traces/BUDGET-调额-20260929-1.md）|
|agent_instance_limit|60|独立代理实例总数（含嵌套审查、重派）（2026-09-29 由 30 调至 60，留痕见 .agents/evidence/traces/BUDGET-调额-20260929-1.md）|
|orchestrator_backfill_limit|3|主代理补位次数上限|
|per_fp_attempt_limit|3|同一真实失败修复尝试上限，第2次起必须换方法|
|stall_limit|2|同一功能点stall重派上限，重派必须新上下文+换方法|
|fp_split_threshold|40|单功能点估算轮次超过此值必须拆分|
|per_worker_turn_limit|未知|宿主未公开步骤限制，不猜测|
|wall_clock_limit_min|未知|跨会话累计无法精确统计，以PROGRESS更新时间粗记|

熔断动作：任一上限达到→停止对应类别派发→全局状态改"熔断"→交用户决定。
