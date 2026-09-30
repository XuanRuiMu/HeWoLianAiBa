# 循环工程预算与熔断-背景实验室

本文件只管背景实验室,不碰根PROGRESS与另一Agent任务。

|字段|值|说明|
|---|---|---|
|total_turn_limit|30|主代理编排轮次上限|
|subagent_call_limit|30|独立代理实例上限,含嵌套审查|
|nested_agent_reserve|6|下一次派发预留|
|orchestrator_backfill_limit|3|主代理补位上限|
|per_fp_attempt_limit|5|同一问题修复上限|
|per_fp_stall_limit|2|同一功能点stall上限|
|wall_clock_limit_minutes|120|墙钟上限|
|per_worker_turn_limit|null|宿主未公开,保持未知|
|per_fp_turn_estimate|见功能点|派发前必填|
|fp_split_threshold|100|超限拆分|
|self_estimated_token_limit|null|未启用|
|total_token_limit|null|宿主无统计|
|per_subagent_token_limit|null|宿主无统计|

熔断沿用循环工程BUDGET规则。熔断后停派发并交用户决定。
