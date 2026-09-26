-- '자동 RLS' 옵션이 만든 이벤트 트리거 함수가 /rest/v1/rpc 로 불릴 수 있어 막는다(트리거 자체는 그대로 돈다)
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
