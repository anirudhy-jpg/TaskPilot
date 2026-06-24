-- Function to handle stopping active timers when a user loses workspace access
CREATE OR REPLACE FUNCTION public.handle_workspace_member_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Stop any active time entries for the user in the removed workspace
    UPDATE public.time_entries
    SET 
        end_time = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time))::integer
    WHERE 
        user_id = OLD.user_id
        AND end_time IS NULL
        AND task_id IN (
            SELECT t.id 
            FROM public.tasks t
            JOIN public.projects p ON t.project_id = p.id
            WHERE p.workspace_id = OLD.workspace_id
        );

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_workspace_member_removal ON public.workspace_members;

CREATE TRIGGER trg_handle_workspace_member_removal
AFTER DELETE ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_workspace_member_removal();
