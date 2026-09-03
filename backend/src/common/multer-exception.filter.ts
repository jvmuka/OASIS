import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';
import { IMAGEM_MAX_MB } from './upload.constants';

/**
 * O multer lanca MulterError fora do fluxo normal de excecoes do Nest
 * (dentro do FileInterceptor, antes do controller), entao sem este filtro
 * global o LIMIT_FILE_SIZE vira um 500 generico em vez de um 400 legivel.
 */
@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const mensagem = exception.code === 'LIMIT_FILE_SIZE'
      ? `Arquivo excede o tamanho maximo permitido (${IMAGEM_MAX_MB} MB).`
      : `Falha no upload do arquivo: ${exception.message}`;
    const erro = new BadRequestException(mensagem);
    res.status(erro.getStatus()).json(erro.getResponse());
  }
}
