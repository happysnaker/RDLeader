import type { EmployeeRow } from '../repositories/employee-repository';
import type { AutonomySettingsRepository } from '../repositories/autonomy-settings-repository';
import type { AutonomousLearningRunRepository, AutonomousLearningRunRow } from '../repositories/autonomous-learning-run-repository';
import type { ReflectionRepository } from '../repositories/reflection-repository';
import type { LearningRecordRepository } from '../repositories/learning-record-repository';
import type { DirectionKnowledgeRepository } from '../repositories/direction-knowledge-repository';
import type { EmployeeMemoryEntry } from '@rdleader/ingest';

function addHours(isoDate: string, hours: number) {
  return new Date(new Date(isoDate).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function buildReflectionSummary(employee: EmployeeRow, memory: EmployeeMemoryEntry[]) {
  const leadingMemory = memory[0]?.summary?.trim();
  if (leadingMemory) {
    return `围绕${leadingMemory}形成了一次自主反思`;
  }

  return `围绕${employee.nextStepSummary}形成了一次自主反思`;
}

function buildLearningSummary(employee: EmployeeRow, memory: EmployeeMemoryEntry[]) {
  const leadingMemory = memory[0]?.summary?.trim();
  if (leadingMemory) {
    return `自主学习沉淀：${leadingMemory}`;
  }

  return `自主学习沉淀：${employee.recentDoneSummary}`;
}

export async function runAutonomousLearningCycle(input: {
  employee: EmployeeRow;
  trigger: string;
  now: () => Date;
  loadMemory: () => Promise<EmployeeMemoryEntry[]>;
  autonomySettingsRepository: AutonomySettingsRepository;
  autonomousLearningRunRepository: AutonomousLearningRunRepository;
  reflectionRepository: ReflectionRepository;
  learningRecordRepository: LearningRecordRepository;
  directionKnowledgeRepository: DirectionKnowledgeRepository;
}): Promise<AutonomousLearningRunRow> {
  const startedAt = input.now().toISOString();
  const settings = input.autonomySettingsRepository.getOrCreate(input.employee.employeeId, startedAt);
  const memory = await input.loadMemory();
  const reflectionSummary = buildReflectionSummary(input.employee, memory);
  const learningSummary = buildLearningSummary(input.employee, memory);

  const reflection = input.reflectionRepository.create({
    employeeId: input.employee.employeeId,
    summary: reflectionSummary,
  });
  const learningRecord = input.learningRecordRepository.create({
    employeeId: input.employee.employeeId,
    reflectionId: reflection.reflectionId,
    title: '自主学习循环沉淀',
    summary: learningSummary,
    scope: settings.autoPromoteToDirectionKnowledge ? 'direction' : 'personal',
  });
  const directionKnowledgeRecord = settings.autoPromoteToDirectionKnowledge
    ? input.directionKnowledgeRepository.create({
        employeeId: input.employee.employeeId,
        directionId: input.employee.directionId,
        learningRecordId: learningRecord.recordId,
        title: learningRecord.title,
        summary: learningRecord.summary,
      })
    : null;

  const autonomySettings = input.autonomySettingsRepository.update(
    input.employee.employeeId,
    {
      lastRunAt: startedAt,
      nextRunAt: addHours(startedAt, settings.cadenceHours),
      runCount: settings.runCount + 1,
      lastOutcome: 'success',
      lastSummary: learningSummary,
    },
    startedAt,
  );

  return input.autonomousLearningRunRepository.create({
    cycleRunId: `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeId: input.employee.employeeId,
    trigger: input.trigger,
    createdAt: startedAt,
    summary: learningSummary,
    reflection,
    learningRecord,
    directionKnowledgeRecord,
    autonomySettings,
  });
}
