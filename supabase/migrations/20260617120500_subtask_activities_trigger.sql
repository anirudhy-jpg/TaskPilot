-- Trigger for task_subtasks activity logging
CREATE OR REPLACE FUNCTION public.log_subtask_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_parent_task_id UUID;
BEGIN
  v_actor_id := auth.uid();
  
  IF TG_OP = 'DELETE' THEN
    v_parent_task_id := OLD.task_id;
  ELSE
    v_parent_task_id := NEW.task_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activities (task_id, actor_id, action_type, metadata)
    VALUES (v_parent_task_id, v_actor_id, 'TASK_UPDATED', jsonb_build_object('subtask', NEW.title, 'action', 'added'));
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.task_activities (task_id, actor_id, action_type, metadata)
      VALUES (v_parent_task_id, v_actor_id, 'TASK_UPDATED', jsonb_build_object('subtask', NEW.title, 'action', 'status_changed', 'old_status', OLD.status, 'new_status', NEW.status));
    END IF;
    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
      INSERT INTO public.task_activities (task_id, actor_id, action_type, metadata)
      VALUES (v_parent_task_id, v_actor_id, 'TASK_UPDATED', jsonb_build_object('subtask', NEW.title, 'action', 'assignee_changed'));
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_subtask_activity ON public.task_subtasks;
CREATE TRIGGER trg_log_subtask_activity
AFTER INSERT OR UPDATE ON public.task_subtasks
FOR EACH ROW
EXECUTE FUNCTION public.log_subtask_activity();
