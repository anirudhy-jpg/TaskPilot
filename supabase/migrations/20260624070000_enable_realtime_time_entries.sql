-- Enable realtime for time_entries to support active timer auto-hide
ALTER PUBLICATION supabase_realtime ADD TABLE time_entries;
