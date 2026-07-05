import nodemailer from 'nodemailer';
import type { Notifier, NotifyMessage, NotifyResult, NotifyTarget } from '@/lib/notify/notify';

/**
 * Gmail SMTP 발송 구현 (notify 격리 경계 ②). 도메인 인증 없이 누구에게나 발송 가능.
 * env: GMAIL_USER(gmail 주소), GMAIL_APP_PASSWORD(앱 비밀번호, 2단계 인증 필요).
 * 발신 주소는 인증 계정이어야 하므로 from 은 GMAIL_USER 기준.
 */
export class GmailNotifier implements Notifier {
  private transport: nodemailer.Transporter;
  private from: string;

  constructor(opts: { user?: string; pass?: string; from?: string } = {}) {
    const user = opts.user ?? process.env.GMAIL_USER;
    const pass = opts.pass ?? process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
      throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD 가 필요합니다.');
    }
    this.transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    this.from = opts.from ?? `겟꿀 <${user}>`;
  }

  async send(target: NotifyTarget, message: NotifyMessage): Promise<NotifyResult> {
    const info = await this.transport.sendMail({
      from: this.from,
      to: target.email,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { id: info.messageId };
  }
}
