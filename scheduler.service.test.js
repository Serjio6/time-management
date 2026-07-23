const { SchedulerService } = require('../../src/services/scheduler.service');

describe('SchedulerService.calculateTaskScore', () => {
  const scheduler = new SchedulerService();

  it('weights urgent priority higher than low priority', () => {
    const urgentTask = { priority: 'urgent', completionHistory: [] };
    const lowTask = { priority: 'low', completionHistory: [] };
    const constraints = { energyLevel: 'medium' };

    expect(scheduler.calculateTaskScore(urgentTask, constraints)).toBeGreaterThan(
      scheduler.calculateTaskScore(lowTask, constraints)
    );
  });

  it('boosts score when a deadline is within 24 hours', () => {
    const soon = { priority: 'medium', deadline: new Date(Date.now() + 3600 * 1000), completionHistory: [] };
    const far = { priority: 'medium', deadline: new Date(Date.now() + 30 * 24 * 3600 * 1000), completionHistory: [] };
    const constraints = { energyLevel: 'medium' };

    expect(scheduler.calculateTaskScore(soon, constraints)).toBeGreaterThan(
      scheduler.calculateTaskScore(far, constraints)
    );
  });
});

describe('SchedulerService.calculateMetrics', () => {
  const scheduler = new SchedulerService();

  it('sums hours per block type', () => {
    const blocks = [
      { type: 'work', startTime: new Date('2026-01-01T09:00:00'), endTime: new Date('2026-01-01T10:00:00') },
      { type: 'break', startTime: new Date('2026-01-01T10:00:00'), endTime: new Date('2026-01-01T10:15:00') },
    ];
    const metrics = scheduler.calculateMetrics(blocks);
    expect(metrics.workHours).toBe(1);
    expect(metrics.breakHours).toBe(0.25);
    expect(metrics.totalPlannedHours).toBe(1.25);
  });
});
