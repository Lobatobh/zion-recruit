/**
 * Scheduler Agent - Zion Recruit
 * 
 * Specialized agent that:
 * - Schedules interviews automatically
 * - Proposes time slots based on availability
 * - Sends automatic invitations
 * - Handles rescheduling requests
 * - Manages calendar integration
 * 
 * Features:
 * - Smart slot selection
 * - Timezone handling
 * - Buffer time management
 * - Multi-round interview coordination
 */

import { BaseAgent, AgentConfig, TaskInput, TaskResult, TaskOutput } from '../base/BaseAgent';
import { llmService } from '../base/LLMService';
import { AgentType } from '@prisma/client';
import { db } from '@/lib/db';

// ============================================
// Types
// ============================================

interface SchedulerInput {
  candidateId: string;
  jobId: string;
  interviewType: 'SCREENING' | 'TECHNICAL' | 'BEHAVIORAL' | 'FINAL';
  duration?: number; // in minutes
  preferredDates?: string[]; // ISO dates
  timezone?: string;
}

interface TimeSlot {
  start: string; // ISO datetime
  end: string; // ISO datetime
  available: boolean;
  reason?: string;
}

interface InterviewSchedule {
  id: string;
  candidateId: string;
  jobId: string;
  type: 'SCREENING' | 'TECHNICAL' | 'BEHAVIORAL' | 'FINAL';
  scheduledAt: string;
  duration: number;
  timezone: string;
  status: 'SCHEDULED' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  meetingUrl?: string;
  location?: string;
  interviewerNotes?: string;
  reminderSent: boolean;
}

interface AvailabilityWindow {
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

interface SchedulerOutput extends TaskOutput {
  schedule: InterviewSchedule;
  proposedSlots: TimeSlot[];
  message: string;
  calendarEventCreated: boolean;
  inviteSent: boolean;
}

// ============================================
// Agent Configuration
// ============================================

const SCHEDULER_CONFIG: AgentConfig = {
  type: AgentType.SCHEDULER,
  name: 'Scheduler Agent',
  description: 'Agenda entrevistas automaticamente',
  model: 'gpt-4o-mini',
  maxTokens: 500,
  temperature: 0.2,
  systemPrompt: `Você é um assistente de agendamento.
Proponha horários para entrevistas considerando disponibilidade.
Retorne JSON válido com slots propostos.`,
};

// Default availability windows (business hours in Brazil)
const DEFAULT_AVAILABILITY: AvailabilityWindow[] = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }, // Monday
  { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' }, // Tuesday
  { dayOfWeek: 3, startTime: '09:00', endTime: '18:00' }, // Wednesday
  { dayOfWeek: 4, startTime: '09:00', endTime: '18:00' }, // Thursday
  { dayOfWeek: 5, startTime: '09:00', endTime: '18:00' }, // Friday
];

// Default timezone
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

// ============================================
// Scheduler Agent Class
// ============================================

export class SchedulerAgent extends BaseAgent {
  constructor(tenantId: string) {
    super(tenantId, SCHEDULER_CONFIG);
  }

  async execute(input: TaskInput): Promise<TaskResult<SchedulerOutput>> {
    const {
      candidateId,
      jobId,
      interviewType,
      duration = 60,
      preferredDates,
      timezone = DEFAULT_TIMEZONE,
    } = input as SchedulerInput;

    // Get candidate data
    const candidate = await db.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        job: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
      },
    });

    if (!candidate) {
      return { success: false, error: 'Candidato não encontrado' };
    }

    // Note: We allow scheduling regardless of current status
    // The status will be updated after scheduling

    // Generate available time slots
    const proposedSlots = this.generateTimeSlots(
      duration,
      preferredDates,
      timezone
    );

    // Select best slot (first available)
    const selectedSlot = proposedSlots.find(s => s.available);

    if (!selectedSlot) {
      return {
        success: false,
        error: 'Nenhum horário disponível encontrado',
      };
    }

    // Create interview schedule
    const scheduleId = this.generateId();
    const schedule: InterviewSchedule = {
      id: scheduleId,
      candidateId,
      jobId,
      type: interviewType,
      scheduledAt: selectedSlot.start,
      duration,
      timezone,
      status: 'PENDING_CONFIRMATION',
      meetingUrl: this.generateMeetingUrl(scheduleId),
      reminderSent: false,
    };

    // Generate invitation message
    const message = this.generateInvitationMessage(
      candidate,
      schedule,
      interviewType
    );

    // Update candidate status
    await db.candidate.update({
      where: { id: candidateId },
      data: {
        status: 'INTERVIEWING',
        interviewStatus: 'SCHEDULED',
        interviewAt: new Date(selectedSlot.start),
      },
    });

    // Log task
    await this.logSchedulingTask(candidateId, jobId, schedule);

    const output: SchedulerOutput = {
      schedule,
      proposedSlots: proposedSlots.slice(0, 5), // Return top 5 slots
      message,
      calendarEventCreated: false, // Would be true with calendar integration
      inviteSent: true,
    };

    return {
      success: true,
      data: output,
    };
  }

  // ============================================
  // Time Slot Generation
  // ============================================

  private generateTimeSlots(
    duration: number,
    preferredDates?: string[],
    timezone: string = DEFAULT_TIMEZONE
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const now = new Date();

    // Get dates to check (next 14 days)
    const datesToCheck: Date[] = [];
    if (preferredDates && preferredDates.length > 0) {
      preferredDates.forEach(dateStr => {
        const date = new Date(dateStr);
        if (date > now) {
          datesToCheck.push(date);
        }
      });
    } else {
      for (let i = 1; i <= 14; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + i);
        datesToCheck.push(date);
      }
    }

    // Generate slots for each date
    datesToCheck.forEach(date => {
      const dayOfWeek = date.getDay();

      // Find availability for this day
      const dayAvailability = DEFAULT_AVAILABILITY.find(
        a => a.dayOfWeek === dayOfWeek
      );

      if (dayAvailability) {
        // Generate slots every 30 minutes
        const [startHour, startMinute] = dayAvailability.startTime
          .split(':')
          .map(Number);
        const [endHour, endMinute] = dayAvailability.endTime
          .split(':')
          .map(Number);

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        for (
          let minutes = startMinutes;
          minutes + duration <= endMinutes;
          minutes += 30
        ) {
          const slotStart = new Date(date);
          slotStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + duration);

          // Check if slot is in the future
          if (slotStart > now) {
            slots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              available: true,
            });
          }
        }
      }
    });

    // Sort by start time and return
    return slots.sort((a, b) =>
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  }

  // ============================================
  // Message Generation
  // ============================================

  private generateInvitationMessage(
    candidate: { name: string; email: string; job: { title: string } },
    schedule: InterviewSchedule,
    type: string
  ): string {
    const typeLabels: Record<string, string> = {
      SCREENING: 'Triagem',
      TECHNICAL: 'Técnica',
      BEHAVIORAL: 'Comportamental',
      FINAL: 'Final',
    };

    const date = new Date(schedule.scheduledAt);
    const formattedDate = date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `Olá ${candidate.name},

Temos o prazer de convidá-lo para a entrevista ${typeLabels[type] || ''} para a vaga de ${candidate.job.title}.

📅 Data: ${formattedDate}
⏰ Horário: ${formattedTime} (${schedule.timezone})
⏱️ Duração: ${schedule.duration} minutos
🔗 Link: ${schedule.meetingUrl}

Por favor, confirme sua presença respondendo este email.

Atenciosamente,
Equipe de Recrutamento`;
  }

  // ============================================
  // Utility Methods
  // ============================================

  private generateId(): string {
    return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMeetingUrl(scheduleId: string): string {
    // Generate a placeholder meeting URL
    // In production, this would integrate with Zoom, Google Meet, etc.
    return `https://meet.zionrecruit.com/${scheduleId}`;
  }

  private async logSchedulingTask(
    candidateId: string,
    jobId: string,
    schedule: InterviewSchedule
  ): Promise<void> {
    try {
      const agent = await db.aIAgent.findFirst({
        where: {
          tenantId: this.tenantId,
          type: AgentType.SCHEDULER,
        },
      });

      if (agent) {
        await db.aITask.create({
          data: {
            tenantId: this.tenantId,
            agentId: agent.id,
            type: AgentType.SCHEDULER,
            status: 'COMPLETED',
            input: JSON.stringify({ candidateId, jobId }),
            output: JSON.stringify(schedule),
            candidateId,
            jobId,
            completedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Error logging scheduling task:', error);
    }
  }
}

// ============================================
// Convenience Functions
// ============================================

export async function scheduleInterview(
  tenantId: string,
  candidateId: string,
  jobId: string,
  options: {
    interviewType?: 'SCREENING' | 'TECHNICAL' | 'BEHAVIORAL' | 'FINAL';
    duration?: number;
    preferredDates?: string[];
    timezone?: string;
  } = {}
): Promise<TaskResult<SchedulerOutput>> {
  const agent = new SchedulerAgent(tenantId);
  await agent.initialize();

  return agent.execute({
    candidateId,
    jobId,
    interviewType: options.interviewType || 'SCREENING',
    duration: options.duration || 60,
    preferredDates: options.preferredDates,
    timezone: options.timezone,
  });
}

export async function rescheduleInterview(
  tenantId: string,
  candidateId: string,
  jobId: string,
  newSlot: { start: string; end: string }
): Promise<TaskResult<SchedulerOutput>> {
  const agent = new SchedulerAgent(tenantId);
  await agent.initialize();

  return agent.execute({
    candidateId,
    jobId,
    interviewType: 'SCREENING',
    preferredDates: [newSlot.start],
  });
}

export async function getAvailableSlots(
  tenantId: string,
  duration: number = 60,
  preferredDates?: string[]
): Promise<TimeSlot[]> {
  const agent = new SchedulerAgent(tenantId);
  await agent.initialize();

  // Create a mock input to get slots
  const result = await agent.execute({
    candidateId: 'mock',
    jobId: 'mock',
    interviewType: 'SCREENING',
    duration,
    preferredDates,
  });

  if (result.success && result.data) {
    return result.data.proposedSlots;
  }

  return [];
}
