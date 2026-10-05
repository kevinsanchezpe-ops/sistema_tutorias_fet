import nodemailer, { Transporter } from 'nodemailer';

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]!));

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  private constructor() {
    this.initTransporter();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public get configured(): boolean {
    return this.isConfigured && !!this.transporter;
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: {
            user,
            pass
          }
        });
        this.isConfigured = true;
        console.log(`✅ [FET Email Service] Servidor SMTP configurado: ${host}:${port} (${user})`);
      } catch (e: any) {
        console.warn('⚠️ [FET Email Service] Error configurando SMTP:', e.message);
        this.transporter = null;
        this.isConfigured = false;
      }
    } else {
      // Modo desarrollo / simulación
      this.isConfigured = false;
      console.log('💡 [FET Email Service] Modo simulación activo (SMTP no configurado en .env). Los correos se registrarán en bitácora/consola.');
    }
  }

  public async sendMail(options: EmailOptions): Promise<boolean> {
    const sender = process.env.SMTP_FROM || '"Agendamientos Tutorías FET" <tutorias@fet.edu.co>';

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: sender,
          to: options.to,
          subject: options.subject,
          html: options.html
        });
        console.log(`📧 [FET Email Service] Correo enviado exitosamente vía SMTP a: ${options.to}`);
        return true;
      } catch (err: any) {
        console.error(`❌ [FET Email Service] Error enviando correo vía SMTP a ${options.to}:`, err.message);
        return false;
      }
    } else {
      console.log(`📨 [FET Email Service SIMULADO] Destino: ${options.to} | Asunto: ${options.subject}`);
      return true;
    }
  }

  /**
   * Envía el correo con enlace o token de recuperación de contraseña.
   */
  public async sendPasswordResetEmail(email: string, fullName: string, resetToken: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}#action=reset-password&token=${encodeURIComponent(resetToken)}`;
    const safeName = escapeHtml(fullName);
    const safeToken = escapeHtml(resetToken);
    const safeResetUrl = escapeHtml(resetUrl);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #059669; margin-bottom: 4px;">Agendamientos Tutorías FET</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Fundación Escuela Tecnológica de Neiva</p>
        </div>
        <p>Hola, <strong>${safeName}</strong>:</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta institucional.</p>
        
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
          <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;">Tu código de seguridad temporal es:</p>
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #059669; font-family: Arial, sans-serif;">${safeToken}</span>
        </div>

        <p style="font-size: 13px; color: #475569;">O haz clic en el siguiente botón para definir una nueva contraseña:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${safeResetUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Restablecer mi Contraseña
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
          * Este código expirará en <strong>30 minutos</strong>.<br/>
          * Si no solicitaste este restablecimiento, puedes ignorar este mensaje; tu contraseña actual continuará siendo segura.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          Fundación Escuela Tecnológica de Neiva - FET | Campus Neiva/Rivera Huila
        </p>
      </div>
    `;

    await this.sendMail({
      to: email,
      subject: 'Restablecimiento de Contraseña - Tutorías FET',
      html
    });
  }

  /**
   * Notificación al docente sobre una nueva solicitud de tutoría.
   */
  public async notifyNewTutoringRequest(teacherEmail: string, teacherName: string, studentName: string, subject: string, date: string, hour: string): Promise<void> {
    const safeTeacher = escapeHtml(teacherName);
    const safeStudent = escapeHtml(studentName);
    const safeSubject = escapeHtml(subject);
    const safeDate = escapeHtml(date);
    const safeHour = escapeHtml(hour);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #059669; margin-bottom: 4px;">Agendamientos Tutorías FET</h2>
        <p>Apreciado(a) <strong>${safeTeacher}</strong>,</p>
        <p>El estudiante <strong>${safeStudent}</strong> ha radicado una nueva solicitud de tutoría para la asignatura <strong>${safeSubject}</strong>.</p>
        <div style="background-color: #f8fafc; padding: 16px; border-left: 4px solid #10b981; border-radius: 4px; margin: 18px 0;">
          <p style="margin: 4px 0;"><strong>Fecha programada:</strong> ${safeDate}</p>
          <p style="margin: 4px 0;"><strong>Horario:</strong> ${safeHour}</p>
        </div>
        <p>Por favor ingresa a la plataforma institucional para aprobar o declinar la solicitud con suficiente antelación.</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 30px;">Fundación Escuela Tecnológica de Neiva - FET | Campus Neiva/Rivera Huila</p>
      </div>
    `;

    await this.sendMail({
      to: teacherEmail,
      subject: `Nueva Solicitud de Tutoría: ${subject} - ${studentName}`,
      html
    });
  }

  /**
   * Notificación al estudiante sobre la confirmación de su tutoría.
   */
  public async notifyTutoringApproved(studentEmail: string, studentName: string, teacherName: string, subject: string, space: string): Promise<void> {
    const safeStudent = escapeHtml(studentName);
    const safeTeacher = escapeHtml(teacherName);
    const safeSubject = escapeHtml(subject);
    const safeSpace = escapeHtml(space);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #059669; margin-bottom: 4px;">Tutoría Confirmada - FET</h2>
        <p>Hola <strong>${safeStudent}</strong>,</p>
        <p>Tu tutoría de la asignatura <strong>${safeSubject}</strong> ha sido <strong style="color: #059669;">CONFIRMADA</strong> por el docente <strong>${safeTeacher}</strong>.</p>
        <div style="background-color: #f8fafc; padding: 16px; border-left: 4px solid #059669; border-radius: 4px; margin: 18px 0;">
          <p style="margin: 4px 0;"><strong>Lugar / Enlace:</strong> ${safeSpace}</p>
        </div>
        <p>Recuerda presentarte puntualmente o conectarte al enlace provisto. Al finalizar la sesión, recuerda calificar el servicio en tu panel.</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 30px;">Fundación Escuela Tecnológica de Neiva - FET</p>
      </div>
    `;

    await this.sendMail({
      to: studentEmail,
      subject: `Tutoría Aprobada: ${subject}`,
      html
    });
  }
}

export const emailService = EmailService.getInstance();
