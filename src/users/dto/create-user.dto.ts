import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

// Regex de contraseña moderada:
// - Mínimo 8 caracteres
// - Al menos una letra
// - Al menos un número
const moderatePasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

export class CreateUserDto {
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(50, { message: 'El nombre no debe superar los 50 caracteres.' })
  name: string;

  @IsEmail({}, { message: 'Debe ingresar un email válido.' })
  @IsNotEmpty({ message: 'El email es obligatorio.' })
  email: string;

  @IsString({ message: 'La contraseña debe ser un texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @Matches(moderatePasswordRegex, {
    message: 'La contraseña debe tener letras y números.',
  })
  password: string;
}
