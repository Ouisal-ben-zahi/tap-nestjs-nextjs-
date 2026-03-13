import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS très permissif : accepte toutes les origines (pratique pour dev local + VPS)
  app.enableCors({
    origin: true,          // reflète automatiquement l'origine de la requête
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });
  const port = parseInt(process.env.PORT ?? "3112", 10);
  await app.listen(port, "0.0.0.0");
}
bootstrap();
