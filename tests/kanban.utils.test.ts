import { describe, it, expect } from 'vitest';
import { groupTasksByColumn, computeFractionalPosition, getColumnFromDropTarget } from '../src/features/kanbanboard/components/kanban/utils';

describe('Kanban Utils', () => {
  describe('groupTasksByColumn', () => {
    it('should group tasks by column ID and sort by position', () => {
      // Mock some tasks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tasks: any[] = [
        { id: '1', columnId: 'col-1', position: 200, createdAt: new Date().toISOString() },
        { id: '2', columnId: 'col-1', position: 100, createdAt: new Date().toISOString() },
        { id: '3', columnId: 'col-2', position: 100, createdAt: new Date().toISOString() },
      ];

      const columns = ['col-1', 'col-2', 'col-3'];
      const grouped = groupTasksByColumn(tasks, columns);

      // Verify grouping
      expect(grouped['col-1']).toHaveLength(2);
      expect(grouped['col-2']).toHaveLength(1);
      expect(grouped['col-3']).toHaveLength(0);

      // Verify sorting (task 2 should be before task 1 because 100 < 200)
      expect(grouped['col-1'][0].id).toBe('2');
      expect(grouped['col-1'][1].id).toBe('1');
    });
  });

  describe('computeFractionalPosition', () => {
    it('should compute position in an empty column', () => {
      const grouped = { 'col-1': [] };
      const pos = computeFractionalPosition('task-1', 'column-col-1', 'col-1', 'col-1', grouped);
      expect(pos).toBe(1000.0);
    });

    it('should compute position when dropping at the top of a column', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const grouped: any = {
        'col-1': [{ id: 'task-1', position: 1000 }]
      };
      // We are dropping a new task over 'task-1'
      const pos = computeFractionalPosition('new-task', 'task-1', 'col-2', 'col-1', grouped);
      expect(pos).toBe(500.0); // (1000 / 2)
    });

    it('should compute position when dropping between two tasks', () => {
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const grouped: any = {
        'col-1': [
          { id: 'task-1', position: 1000 },
          { id: 'task-2', position: 2000 }
        ]
      };
      // Dropping over task-2 means dropping between task-1 and task-2
      const pos = computeFractionalPosition('new-task', 'task-2', 'col-2', 'col-1', grouped);
      expect(pos).toBe(1500.0); // (1000 + 2000) / 2
    });
  });

  describe('getColumnFromDropTarget', () => {
    it('should extract column from a column droppable', () => {
      const colId = getColumnFromDropTarget({ id: 'column-todo' } as never, {});
      expect(colId).toBe('todo');
    });
  });
});
