import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class SendEmailDto {
  @IsEmail({}, { message: 'El email del destinatario debe ser válido' })
  to: string;

  @IsString({ message: 'El asunto es requerido' })
  subject: string;

  @IsString({ message: 'El contenido del email es requerido' })
  text: string;

  @IsOptional()
  @IsString()
  html?: string;
}

export class SendBulkEmailDto {
  @IsArray({ message: 'Debe proporcionar un array de emails' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un email' })
  emails: Array<{
    to: string;
    subject: string;
    text: string;
    html?: string;
  }>;
}

export class SendTemplateEmailDto {
  @IsEmail({}, { message: 'El email del destinatario debe ser válido' })
  to: string;

  @IsString({ message: 'El asunto es requerido' })
  subject: string;

  @IsString({ message: 'El título es requerido' })
  title: string;

  @IsString({ message: 'El contenido es requerido' })
  content: string;

  @IsOptional()
  @IsString()
  footer?: string;
}
