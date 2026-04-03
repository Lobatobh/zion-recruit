/**
 * Send Email Processor
 * Zion Recruit - Background Job Queue System
 * 
 * Sends emails using the configured email service.
 */

import { db } from '@/lib/db'
import {
  JobProcessor,
  SendEmailInput,
  SendEmailOutput,
  JobProcessorContext,
  JobError,
} from '../job-types'

export const sendEmailProcessor: JobProcessor<SendEmailInput, SendEmailOutput> = async (
  input: SendEmailInput,
  context: JobProcessorContext
): Promise<SendEmailOutput> => {
  const { to, subject, body, html, options = {} } = input
  const { updateProgress, checkCancelled, logger, tenantId } = context

  const recipients = Array.isArray(to) ? to : [to]
  logger.info(`Sending email to ${recipients.join(', ')}: ${subject}`)

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false)
  }

  await updateProgress(20, 'Preparing email')

  // Get email configuration for tenant
  const emailConfig = tenantId ? await db.apiCredential.findFirst({
    where: {
      tenantId,
      provider: 'RESEND',
      isActive: true,
    },
  }) : null

  await updateProgress(40, 'Sending email')

  // Check if cancelled
  if (await checkCancelled()) {
    throw new JobError('Job cancelled', 'CANCELLED', false)
  }

  let messageId: string
  let provider: string

  try {
    if (emailConfig?.apiKey) {
      // Use Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${emailConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@zionrecruit.com',
          to: recipients,
          subject,
          html: html || body.replace(/\n/g, '<br>'),
          text: body,
          cc: options.cc,
          bcc: options.bcc,
          reply_to: options.replyTo,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new JobError(
          `Resend API error: ${response.status} - ${JSON.stringify(errorData)}`,
          'EMAIL_ERROR',
          true
        )
      }

      const data = await response.json()
      messageId = data.id
      provider = 'resend'

      // Update last used
      await db.apiCredential.update({
        where: { id: emailConfig.id },
        data: { lastUsedAt: new Date() },
      })
    } else {
      // Fallback: Simulate sending (log only)
      logger.warn('No email configuration found, simulating send')
      messageId = `simulated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      provider = 'simulated'
    }
  } catch (error) {
    logger.error('Failed to send email', error)
    throw new JobError(
      `Failed to send email: ${error instanceof Error ? error.message : String(error)}`,
      'EMAIL_ERROR',
      true
    )
  }

  await updateProgress(100, 'Email sent')

  logger.info(`Email sent successfully`, { messageId, provider, recipients })

  return {
    messageId,
    to: recipients,
    sentAt: new Date(),
    provider,
  }
}
